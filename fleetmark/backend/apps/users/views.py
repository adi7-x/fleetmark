import logging
import os
import secrets
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.shortcuts import redirect as django_redirect
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

from apps.users.models import User
from apps.users.serializers import (
    OAuth42LoginSerializer,
    TokenResponseSerializer,
    UserAdminSerializer,
    UserSerializer,
)
from apps.users.permissions import IsLogisticsStaff
from apps.users.tokens import PreAuth2FAToken

# ──────────────────────────────────────────────────────────────────────────────
# 42 OAuth settings (read from environment)
# ──────────────────────────────────────────────────────────────────────────────
INTRA_42_CLIENT_ID = os.environ.get('INTRA_42_CLIENT_ID', '')
INTRA_42_CLIENT_SECRET = os.environ.get('INTRA_42_CLIENT_SECRET', '')
INTRA_42_REDIRECT_URI = os.environ.get(
    'INTRA_42_REDIRECT_URI',
    'http://localhost:8000/api/v1/auth/42/callback/',
)
INTRA_42_AUTHORIZE_URL = 'https://api.intra.42.fr/oauth/authorize'
INTRA_42_TOKEN_URL = 'https://api.intra.42.fr/oauth/token'
INTRA_42_USER_URL = 'https://api.intra.42.fr/v2/me'

ADMIN_42_LOGIN = getattr(settings, 'ADMIN_42_LOGIN', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# CSRF protection for the OAuth flow: a random `state` is issued at /42/login/,
# stored in this HttpOnly cookie, and echoed back by 42 at /42/callback/.
# The callback rejects any request whose state does not match the cookie.
OAUTH_STATE_COOKIE = 'fleetmark_oauth_state'
OAUTH_STATE_MAX_AGE = 600  # seconds (10 minutes to complete the 42 login)

# The refresh token never reaches JS: it lives only in this HttpOnly cookie,
# scoped to the auth path so it's sent only to the endpoints that need it
# (token refresh, 2FA login-verify, logout). Access tokens are short-lived
# and handed to the SPA to hold in memory; the refresh token is the
# long-lived credential (7 days) an XSS payload would actually want, so
# that's the one kept out of reach of any JS running on the page.
REFRESH_COOKIE = 'fleetmark_refresh'
REFRESH_COOKIE_PATH = '/api/v1/auth/'


def _revoke_refresh_cookie(request):
    """Blacklist the refresh token in the request cookie, if any, so a copy of
    it (shared machine, stolen cookie) stops working after logout."""
    raw = request.COOKIES.get(REFRESH_COOKIE)
    if raw:
        try:
            RefreshToken(raw).blacklist()
        except TokenError:
            pass


def _set_refresh_cookie(response, refresh_token_str):
    max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token_str,
        max_age=max_age,
        httponly=True,
        secure=True,
        samesite='Lax',
        path=REFRESH_COOKIE_PATH,
    )


def _oauth_error(request, message, code, http_status, **extra):
    """A browser that fails mid-OAuth is sent back to the landing page with a
    short error code it can explain; API clients (and tests) still get JSON."""
    if 'text/html' in request.META.get('HTTP_ACCEPT', ''):
        resp = django_redirect(f'{FRONTEND_URL}/?auth_error={code}')
    else:
        resp = Response({'error': message, **extra}, status=http_status)
    resp.delete_cookie(OAUTH_STATE_COOKIE)
    return resp


class OAuth42LoginView(APIView):
    """
    GET /api/v1/auth/42/login/

    Returns the 42 Intra OAuth authorization URL.
    The frontend redirects the user's browser to this URL.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        state = secrets.token_urlsafe(32)
        params = {
            'client_id': INTRA_42_CLIENT_ID,
            'redirect_uri': INTRA_42_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'public',
            'state': state,
        }
        authorization_url = f'{INTRA_42_AUTHORIZE_URL}?{urlencode(params)}'
        response = Response(
            {'authorization_url': authorization_url},
            status=status.HTTP_200_OK,
        )
        # Bind the state to the browser via an HttpOnly cookie. SameSite=Lax so
        # it is still sent on the top-level callback navigation coming from 42.
        response.set_cookie(
            OAUTH_STATE_COOKIE,
            state,
            max_age=OAUTH_STATE_MAX_AGE,
            httponly=True,
            secure=True,
            samesite='Lax',
        )
        return response


class OAuth42CallbackView(APIView):
    """
    GET /api/v1/auth/42/callback/?code=<authorization_code>

    1. Exchanges the authorization code for a 42 access token.
    2. Fetches the user's 42 profile (login, email).
    3. Creates or retrieves the local User record.
    4. Assigns LOGISTICS_STAFF role if login matches ADMIN_42_LOGIN.
    5. Issues a JWT pair (access + refresh) and returns it with the user profile.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        if not code:
            # 42 sends ?error=access_denied when the user cancels consent.
            return _oauth_error(request, 'Missing authorization code.', 'denied', status.HTTP_400_BAD_REQUEST)

        # ── Step 0: CSRF protection — validate the OAuth state ────────────
        # The state returned by 42 must match the one we issued at /42/login/
        # (stored in the HttpOnly cookie). A missing/forged state is rejected.
        returned_state = request.query_params.get('state')
        expected_state = request.COOKIES.get(OAUTH_STATE_COOKIE)
        if (
            not returned_state
            or not expected_state
            or not secrets.compare_digest(returned_state, expected_state)
        ):
            return _oauth_error(request, 'Invalid or missing OAuth state.', 'expired', status.HTTP_400_BAD_REQUEST)

        # ── Step 1: Exchange code for 42 access token ────────────────────
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': INTRA_42_CLIENT_ID,
            'client_secret': INTRA_42_CLIENT_SECRET,
            'code': code,
            'redirect_uri': INTRA_42_REDIRECT_URI,
        }
        token_response = requests.post(INTRA_42_TOKEN_URL, data=token_data, timeout=10)
        if token_response.status_code != 200:
            logger.error(
                '42 token exchange failed: status=%s body=%s redirect_uri=%s',
                token_response.status_code,
                token_response.text,
                INTRA_42_REDIRECT_URI,
            )
            return _oauth_error(
                request, 'Failed to obtain access token from 42.', 'provider',
                status.HTTP_502_BAD_GATEWAY, detail=token_response.text,
            )
        access_token_42 = token_response.json().get('access_token')

        # ── Step 2: Fetch 42 user profile ────────────────────────────────
        headers = {'Authorization': f'Bearer {access_token_42}'}
        profile_response = requests.get(INTRA_42_USER_URL, headers=headers, timeout=10)
        if profile_response.status_code != 200:
            return _oauth_error(request, 'Failed to fetch user profile from 42.', 'provider', status.HTTP_502_BAD_GATEWAY)
        profile = profile_response.json()
        login_42 = profile.get('login')
        email = profile.get('email')

        if not login_42 or not email:
            return _oauth_error(request, 'Incomplete profile data from 42.', 'provider', status.HTTP_502_BAD_GATEWAY)

        # 42 profile image: prefer the full link, fall back to the small version.
        image = profile.get('image') or {}
        avatar_url = image.get('link') or (image.get('versions') or {}).get('small')

        # ── Step 3: Get or create local user ─────────────────────────────
        role = 'LOGISTICS_STAFF' if login_42 == ADMIN_42_LOGIN else 'STUDENT'

        try:
            with transaction.atomic():
                user, created = User.objects.get_or_create(
                    login_42=login_42,
                    defaults={
                        'email': email,
                        'role': role,
                        'avatar_url': avatar_url,
                    },
                )
        except IntegrityError:
            return _oauth_error(request, 'This email is already linked to another account.', 'provider', status.HTTP_409_CONFLICT)

        if not user.is_active:
            return _oauth_error(request, 'This account has been deactivated.', 'blocked', status.HTTP_403_FORBIDDEN)

        # If user existed but email changed on 42 side, update it (unless taken)
        if not created and user.email != email and not User.objects.filter(email=email).exclude(pk=user.pk).exists():
            user.email = email
            user.save(update_fields=['email'])

        # Refresh the avatar on every login if it changed on the 42 side
        if not created and avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
            user.save(update_fields=['avatar_url'])

        # Promote to staff if login matches admin login and role was wrong
        if login_42 == ADMIN_42_LOGIN and user.role != 'LOGISTICS_STAFF':
            user.role = 'LOGISTICS_STAFF'
            user.is_staff = True
            user.save(update_fields=['role', 'is_staff'])

        # ── Step 4: Issue tokens — or, if 2FA is on, don't ────────────────
        # A user with TOTP enabled does NOT get a session here. They get a
        # short-lived pre-auth token that proves "just completed 42 OAuth as
        # this user" but authenticates nowhere (see PreAuth2FAToken). The
        # real access/refresh pair is only minted by TOTPLoginVerifyView,
        # after a valid TOTP code. This is what makes 2FA mandatory instead
        # of a frontend-only prompt the user could simply skip.
        user_data = UserSerializer(user).data
        totp_required = bool(user.totp_enabled)
        accept = request.META.get('HTTP_ACCEPT', '')

        if totp_required:
            preauth_tok = str(PreAuth2FAToken.for_user(user))

            if 'application/json' in accept:
                resp = Response({
                    'preauth': preauth_tok,
                    'user': user_data,
                    'totp_required': True,
                }, status=status.HTTP_200_OK)
                resp.delete_cookie(OAUTH_STATE_COOKIE)
                return resp

            frontend_callback = (
                f'{FRONTEND_URL}/auth/callback'
                f'#preauth={preauth_tok}'
                f'&totp=1'
            )
            resp = django_redirect(frontend_callback)
            resp.delete_cookie(OAUTH_STATE_COOKIE)
            return resp

        # No 2FA — issue the real pair now. The refresh token goes in the
        # HttpOnly cookie only; the access token is the only credential
        # handed to JS, and only via this one-time redirect fragment.
        refresh = RefreshToken.for_user(user)
        access_tok = str(refresh.access_token)

        if 'application/json' in accept:
            resp = Response({
                'access': access_tok,
                'user': user_data,
                'totp_required': False,
            }, status=status.HTTP_200_OK)
        else:
            frontend_callback = (
                f'{FRONTEND_URL}/auth/callback'
                f'#access={access_tok}'
                f'&role={user_data.get("role", "")}'
                f'&login={user_data.get("login_42", "")}'
                f'&totp=0'
            )
            resp = django_redirect(frontend_callback)

        resp.delete_cookie(OAUTH_STATE_COOKIE)
        _set_refresh_cookie(resp, str(refresh))
        return resp


class ProfileView(APIView):
    """
    GET  /api/v1/auth/me/   — Return current user's profile.
    PATCH /api/v1/auth/me/  — Update allowed fields (station).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserListView(generics.ListAPIView):
    """
    GET /api/v1/auth/users/ — List all users (logistics staff only).
    """
    queryset = User.objects.all()
    serializer_class = UserAdminSerializer
    permission_classes = [IsLogisticsStaff]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/auth/users/<id>/ — View a user.
    PATCH  /api/v1/auth/users/<id>/ — Edit role, station, is_active.
    DELETE /api/v1/auth/users/<id>/ — Delete a user.
    Logistics staff only.
    """
    queryset = User.objects.all()
    serializer_class = UserAdminSerializer
    permission_classes = [IsLogisticsStaff]
    # No DELETE/PUT: staff manage access by role and block/unblock; account
    # deletion is the user's own GDPR action (/me/delete/).
    http_method_names = ['get', 'patch', 'head', 'options']


# ──────────────────────────────────────────────────────────────────────────────
# GDPR Compliance Endpoints
# ──────────────────────────────────────────────────────────────────────────────

class GDPRDataExportView(APIView):
    """
    GET /api/v1/auth/me/export/

    GDPR Art.20 — Return all personal data held for the authenticated user
    as a JSON download (data portability).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.reservations.models import Reservation
        from apps.reports.models import IncidentReport

        user = request.user

        reservations = Reservation.objects.filter(student=user).select_related('trip', 'trip__route', 'trip__bus')
        reports = IncidentReport.objects.filter(reporter=user)

        data = {
            'profile': {
                'id': str(user.id),
                'login_42': user.login_42,
                'email': user.email,
                'role': user.role,
                'station': str(user.station_id) if user.station_id else None,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None,
            },
            'reservations': [
                {
                    'id': str(r.id),
                    'trip_route': str(r.trip.route) if r.trip else None,
                    'trip_departure': r.trip.departure_datetime.isoformat() if r.trip else None,
                    'created_at': r.created_at.isoformat(),
                }
                for r in reservations
            ],
            'incident_reports': [
                {
                    'id': str(r.id),
                    'category': r.category,
                    'description': r.description,
                    'status': r.status,
                    'created_at': r.created_at.isoformat(),
                }
                for r in reports
            ],
            'exported_at': timezone.now().isoformat(),
        }

        response = Response(data, status=status.HTTP_200_OK)
        response['Content-Disposition'] = 'attachment; filename="fleetmark-data-export.json"'
        return response


class GDPRAccountDeleteView(APIView):
    """
    POST /api/v1/auth/me/delete/

    GDPR Art.17 — Right to erasure. Anonymises the user's personal data
    and deactivates the account. Reservation history is kept with
    anonymised references for audit purposes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Anonymise personal identifiers
        user.login_42 = None
        user.email = f'deleted-{user.id}@anonymised.local'
        user.is_active = False
        user.station = None
        user.set_unusable_password()
        user.role = 'STUDENT'
        user.is_staff = False
        user.totp_secret = None
        user.totp_enabled = False
        user.avatar_url = None
        user.save(update_fields=['login_42', 'email', 'is_active', 'station', 'password',
                                 'role', 'is_staff', 'totp_secret', 'totp_enabled', 'avatar_url'])

        logger.info('GDPR account deletion completed for user %s', user.id)

        resp = Response(
            {'detail': 'Your account has been anonymised and deactivated.'},
            status=status.HTTP_200_OK,
        )
        _revoke_refresh_cookie(request)
        resp.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)
        return resp


# ──────────────────────────────────────────────────────────────────────────────
# Two-Factor Authentication (TOTP)
# ──────────────────────────────────────────────────────────────────────────────

# A 6-digit code has only 10^6 values; without a per-account limit it can be
# brute-forced from many IPs (the anon rate limit is per IP). After
# TOTP_MAX_FAILURES wrong codes the account's 2FA checks are locked for
# TOTP_LOCK_SECONDS, whichever endpoint or IP the attempts come from.
# ponytail: the default cache is per-process, so production runs ONE gunicorn
# process with threads (entrypoint.sh). Switch to RedisCache (atomic INCR)
# before raising --workers.
TOTP_MAX_FAILURES = 5
TOTP_LOCK_SECONDS = 15 * 60


def _check_totp(user, code):
    """Returns None if the code is valid, else an error Response."""
    import pyotp
    from django.core.cache import cache

    key = f'totp-failures:{user.pk}'
    # Reserve the attempt atomically *before* checking the code, so parallel
    # requests can't all read "0 failures" and slip past the limit.
    cache.add(key, 0, TOTP_LOCK_SECONDS)
    try:
        attempts = cache.incr(key)
    except ValueError:  # key expired between add() and incr()
        cache.add(key, 1, TOTP_LOCK_SECONDS)
        attempts = 1
    if attempts > TOTP_MAX_FAILURES:
        if attempts == TOTP_MAX_FAILURES + 1:
            logger.warning('2FA locked for user %s after %d wrong codes', user.pk, TOTP_MAX_FAILURES)
        return Response(
            {'detail': 'Too many wrong codes. Try again in 15 minutes.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    code = str(code).strip()
    if not (code.isascii() and code.isdigit() and len(code) == 6) or not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        return Response({'detail': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)
    # A code stays valid for up to 90 s (valid_window=1); accept each code once.
    if not cache.add(f'totp-used:{user.pk}:{code}', True, 90):
        return Response({'detail': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)
    cache.delete(key)
    return None


class TOTPSetupView(APIView):
    """
    POST /api/v1/auth/2fa/setup/

    Generate a TOTP secret for the authenticated user and return the
    provisioning URI (for QR code) plus the raw secret.
    The secret is stored but 2FA is NOT enabled until verified.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import pyotp

        user = request.user
        if user.totp_enabled:
            return Response(
                {'detail': '2FA is already enabled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        secret = pyotp.random_base32()
        user.totp_secret = secret
        user.save(update_fields=['totp_secret'])

        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name='Fleetmark SSBS',
        )

        # SVG needs no Pillow; sent as a data URI the SPA can drop into <img>.
        import base64
        import qrcode
        import qrcode.image.svg
        svg = qrcode.make(provisioning_uri, image_factory=qrcode.image.svg.SvgPathImage).to_string()
        qr_code = 'data:image/svg+xml;base64,' + base64.b64encode(svg).decode()

        return Response({
            'secret': secret,
            'provisioning_uri': provisioning_uri,
            'qr_code': qr_code,
        }, status=status.HTTP_200_OK)


class TOTPVerifyView(APIView):
    """
    POST /api/v1/auth/2fa/verify/
    Body: { "code": "123456" }

    Verify a TOTP code against the stored secret.
    On first successful verification, enables 2FA for the user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import pyotp

        user = request.user
        code = request.data.get('code', '')

        if not user.totp_secret:
            return Response(
                {'detail': 'No 2FA secret configured. Call /2fa/setup/ first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        denied = _check_totp(user, code)
        if denied:
            return denied

        if not user.totp_enabled:
            user.totp_enabled = True
            user.save(update_fields=['totp_enabled'])
            logger.info('2FA enabled for user %s', user.id)

        return Response({'detail': '2FA verified successfully.'}, status=status.HTTP_200_OK)


class TOTPDisableView(APIView):
    """
    POST /api/v1/auth/2fa/disable/
    Body: { "code": "123456" }

    Disable 2FA for the authenticated user after verifying a valid code.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import pyotp

        user = request.user
        code = request.data.get('code', '')

        if not user.totp_enabled:
            return Response(
                {'detail': '2FA is not enabled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        denied = _check_totp(user, code)
        if denied:
            return denied

        user.totp_secret = None
        user.totp_enabled = False
        user.save(update_fields=['totp_secret', 'totp_enabled'])
        logger.info('2FA disabled for user %s', user.id)

        return Response({'detail': '2FA has been disabled.'}, status=status.HTTP_200_OK)


class TOTPLoginVerifyView(APIView):
    """
    POST /api/v1/auth/2fa/login-verify/
    Body: { "preauth": "<token from the OAuth callback>", "code": "123456" }

    Completes login for a user whose account has 2FA enabled. The OAuth
    callback issued only a pre-auth token (no session, no access, no
    refresh) — this exchanges that token plus a valid TOTP code for the
    real access/refresh pair. This is the only path that can turn a
    pre-auth token into a session, and it requires a correct code.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        import pyotp

        preauth_str = request.data.get('preauth', '')
        code = request.data.get('code', '')

        if not preauth_str or not code:
            return Response(
                {'detail': 'preauth and code are both required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            preauth = PreAuth2FAToken(preauth_str)
        except TokenError:
            return Response(
                {'detail': 'Invalid or expired login attempt. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = User.objects.get(pk=preauth['user_id'])
        except (User.DoesNotExist, KeyError):
            return Response(
                {'detail': 'Invalid or expired login attempt. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.totp_enabled or not user.totp_secret:
            # 2FA was disabled between the OAuth callback and this request.
            return Response(
                {'detail': '2FA is not enabled for this account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response({'detail': 'This account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)

        denied = _check_totp(user, code)
        if denied:
            return denied

        # A pre-auth token buys exactly one session (checked after the code so
        # a typo doesn't burn it). cache.add is atomic.
        from django.core.cache import cache
        if not cache.add(f'preauth-used:{preauth["jti"]}', 1, int(PreAuth2FAToken.lifetime.total_seconds())):
            return Response(
                {'detail': 'Invalid or expired login attempt. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        access_tok = str(refresh.access_token)
        user_data = UserSerializer(user).data

        resp = Response({
            'access': access_tok,
            'user': user_data,
        }, status=status.HTTP_200_OK)
        _set_refresh_cookie(resp, str(refresh))
        return resp


class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/auth/token/refresh/

    Reads the refresh token from the HttpOnly cookie — never from the
    request body, since the SPA never has it in the first place. Returns a
    fresh access token. This replaces SimpleJWT's stock TokenRefreshView,
    which expected the refresh token in the POST body.
    """
    permission_classes = [AllowAny]
    # The SPA calls this on every full page load and the request is
    # anonymous by construction (the credential is the HttpOnly cookie, not
    # an Authorization header), so it must not share the generic anon
    # browsing budget — see DEFAULT_THROTTLE_RATES['token_refresh'].
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'token_refresh'

    def post(self, request):
        raw = request.COOKIES.get(REFRESH_COOKIE)
        if not raw:
            return Response(
                {'detail': 'No refresh token cookie.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw)
            user_id = refresh.get(settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id'))
            # A user blocked in Users & Roles must lose the session, not keep
            # minting access tokens that every API call then rejects.
            if not User.objects.filter(pk=user_id, is_active=True).exists():
                raise TokenError('inactive user')
        except TokenError:
            resp = Response(
                {'detail': 'Refresh token invalid or expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            resp.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)
            return resp

        return Response({'access': str(refresh.access_token)}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    Clears the refresh-token cookie server-side. JS cannot delete an
    HttpOnly cookie itself, so logout has to be a real request, not just a
    client-side localStorage clear. The access token the SPA is holding in
    memory is simply dropped by the caller; it expires on its own shortly
    after (ACCESS_TOKEN_LIFETIME).
    """
    permission_classes = [AllowAny]
    # Removing a credential must never be rate-limited away.
    throttle_classes = []

    def post(self, request):
        # A cross-site HTML form can't send application/json, and a cross-site
        # fetch with it needs a CORS preflight the allowlist refuses.
        if request.content_type != 'application/json':
            return Response({'detail': 'Bad request.'}, status=status.HTTP_400_BAD_REQUEST)
        _revoke_refresh_cookie(request)
        resp = Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)
        resp.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)
        return resp
