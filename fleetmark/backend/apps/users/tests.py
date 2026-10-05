from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User
from apps.stations.models import Station


class OAuth42LoginViewTest(TestCase):
    """Tests for GET /api/v1/auth/42/login/"""

    def setUp(self):
        self.client = APIClient()

    def test_returns_authorization_url(self):
        response = self.client.get('/api/v1/auth/42/login/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('authorization_url', response.data)
        self.assertIn('api.intra.42.fr', response.data['authorization_url'])
        self.assertIn('response_type=code', response.data['authorization_url'])

    def test_login_sets_state_cookie_and_state_param(self):
        # H2: a CSRF state is issued in an HttpOnly cookie and embedded in the URL.
        response = self.client.get('/api/v1/auth/42/login/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('fleetmark_oauth_state', response.cookies)
        state = response.cookies['fleetmark_oauth_state'].value
        self.assertTrue(state)
        self.assertTrue(response.cookies['fleetmark_oauth_state']['httponly'])
        self.assertIn(f'state={state}', response.data['authorization_url'])


class OAuth42CallbackViewTest(TestCase):
    """Tests for GET /api/v1/auth/42/callback/?code=xxx"""

    def setUp(self):
        self.client = APIClient()

    def test_missing_code_returns_400(self):
        response = self.client.get('/api/v1/auth/42/callback/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_callback_rejects_missing_state(self):
        # H2: a code with no state (and no cookie) is rejected before any 42 call.
        response = self.client.get('/api/v1/auth/42/callback/', {'code': 'valid-code'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_callback_rejects_mismatched_state(self):
        # H2: a forged state that does not match the cookie is rejected (CSRF).
        self.client.cookies['fleetmark_oauth_state'] = 'cookie-state'
        response = self.client.get(
            '/api/v1/auth/42/callback/', {'code': 'valid-code', 'state': 'attacker-state'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    @patch('apps.users.views.requests.get')
    @patch('apps.users.views.requests.post')
    def test_successful_callback_creates_user_and_returns_tokens(self, mock_post, mock_get):
        # Mock 42 token exchange
        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {'access_token': 'fake-42-token'}
        mock_post.return_value = mock_token_response

        # Mock 42 profile fetch
        mock_profile_response = MagicMock()
        mock_profile_response.status_code = 200
        mock_profile_response.json.return_value = {
            'login': 'testuser42',
            'email': 'test@student.42.fr',
        }
        mock_get.return_value = mock_profile_response

        self.client.cookies['fleetmark_oauth_state'] = 'valid-state'
        response = self.client.get(
            '/api/v1/auth/42/callback/', {'code': 'valid-code', 'state': 'valid-state'}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('/auth/callback#access=', response.url)
        self.assertIn('&role=STUDENT', response.url)
        self.assertIn('&login=testuser42', response.url)
        self.assertIn('&totp=0', response.url)
        # H3: the refresh token is never in the URL — only in the cookie.
        self.assertNotIn('refresh=', response.url)
        self.assertIn('fleetmark_refresh', response.cookies)
        self.assertTrue(response.cookies['fleetmark_refresh']['httponly'])

        # Verify user was created in DB
        self.assertTrue(User.objects.filter(login_42='testuser42').exists())

    @patch('apps.users.views.requests.get')
    @patch('apps.users.views.requests.post')
    def test_callback_returns_existing_user(self, mock_post, mock_get):
        # Pre-create user
        User.objects.create_user(
            email='existing@student.42.fr',
            login_42='existinguser',
            role='STUDENT',
        )

        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {'access_token': 'fake-token'}
        mock_post.return_value = mock_token_response

        mock_profile_response = MagicMock()
        mock_profile_response.status_code = 200
        mock_profile_response.json.return_value = {
            'login': 'existinguser',
            'email': 'existing@student.42.fr',
        }
        mock_get.return_value = mock_profile_response

        self.client.cookies['fleetmark_oauth_state'] = 'valid-state'
        response = self.client.get(
            '/api/v1/auth/42/callback/', {'code': 'valid-code', 'state': 'valid-state'}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(User.objects.filter(login_42='existinguser').count(), 1)

    @patch('apps.users.views.ADMIN_42_LOGIN', 'admin42')
    @patch('apps.users.views.requests.get')
    @patch('apps.users.views.requests.post')
    def test_admin_login_gets_logistics_staff_role(self, mock_post, mock_get):
        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {'access_token': 'fake-token'}
        mock_post.return_value = mock_token_response

        mock_profile_response = MagicMock()
        mock_profile_response.status_code = 200
        mock_profile_response.json.return_value = {
            'login': 'admin42',
            'email': 'admin@student.42.fr',
        }
        mock_get.return_value = mock_profile_response

        self.client.cookies['fleetmark_oauth_state'] = 'valid-state'
        response = self.client.get(
            '/api/v1/auth/42/callback/', {'code': 'valid-code', 'state': 'valid-state'}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('&role=LOGISTICS_STAFF', response.url)

    @patch('apps.users.views.requests.get')
    @patch('apps.users.views.requests.post')
    def test_callback_saves_avatar_url_from_42_profile(self, mock_post, mock_get):
        # TASK 2: the 42 profile image.link is stored on the User as avatar_url.
        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {'access_token': 'fake-42-token'}
        mock_post.return_value = mock_token_response

        mock_profile_response = MagicMock()
        mock_profile_response.status_code = 200
        mock_profile_response.json.return_value = {
            'login': 'avataruser',
            'email': 'avatar@student.42.fr',
            'image': {
                'link': 'https://cdn.intra.42.fr/users/avataruser.jpg',
                'versions': {'small': 'https://cdn.intra.42.fr/users/small_avataruser.jpg'},
            },
        }
        mock_get.return_value = mock_profile_response

        self.client.cookies['fleetmark_oauth_state'] = 'valid-state'
        response = self.client.get(
            '/api/v1/auth/42/callback/', {'code': 'valid-code', 'state': 'valid-state'}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        user = User.objects.get(login_42='avataruser')
        self.assertEqual(user.avatar_url, 'https://cdn.intra.42.fr/users/avataruser.jpg')

    @patch('apps.users.views.requests.get')
    @patch('apps.users.views.requests.post')
    def test_callback_with_2fa_enabled_issues_preauth_not_tokens(self, mock_post, mock_get):
        # H1: a user with TOTP enabled must not get a real session from the
        # OAuth callback alone — only a short-lived pre-auth token.
        User.objects.create_user(
            email='totpuser@student.42.fr',
            login_42='totpuser',
            role='STUDENT',
            totp_enabled=True,
            totp_secret='JBSWY3DPEHPK3PXP',
        )

        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {'access_token': 'fake-token'}
        mock_post.return_value = mock_token_response

        mock_profile_response = MagicMock()
        mock_profile_response.status_code = 200
        mock_profile_response.json.return_value = {
            'login': 'totpuser',
            'email': 'totpuser@student.42.fr',
        }
        mock_get.return_value = mock_profile_response

        self.client.cookies['fleetmark_oauth_state'] = 'valid-state'
        response = self.client.get(
            '/api/v1/auth/42/callback/', {'code': 'valid-code', 'state': 'valid-state'}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn('/auth/callback#preauth=', response.url)
        self.assertIn('&totp=1', response.url)
        self.assertNotIn('access=', response.url)
        # No session was granted — no refresh cookie either.
        self.assertNotIn('fleetmark_refresh', response.cookies)

    @patch('apps.users.views.requests.post')
    def test_failed_token_exchange_returns_502(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = 'Unauthorized'
        mock_post.return_value = mock_response

        self.client.cookies['fleetmark_oauth_state'] = 'valid-state'
        response = self.client.get(
            '/api/v1/auth/42/callback/', {'code': 'bad-code', 'state': 'valid-state'}
        )
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)


class TokenRefreshViewTest(TestCase):
    """Tests for POST /api/v1/auth/token/refresh/

    H3: the refresh token now travels only via the HttpOnly cookie — the
    endpoint no longer accepts it in the request body at all.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='refresh@test.com',
            password='testpass123',
            login_42='refreshuser',
        )

    def test_valid_refresh_cookie_returns_new_access_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)

        self.client.cookies['fleetmark_refresh'] = str(refresh)
        response = self.client.post('/api/v1/auth/token/refresh/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertNotIn('refresh', response.data)

    def test_refresh_token_in_body_is_ignored_without_cookie(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)

        # No cookie set — a refresh token in the body must NOT work.
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_cookie_returns_401(self):
        response = self.client.post('/api/v1/auth/token/refresh/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_cookie_returns_401_and_clears_cookie(self):
        self.client.cookies['fleetmark_refresh'] = 'garbage-token'
        response = self.client.post('/api/v1/auth/token/refresh/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.cookies['fleetmark_refresh'].value, '')


class TOTPLoginVerifyViewTest(TestCase):
    """Tests for POST /api/v1/auth/2fa/login-verify/ — completing a 2FA login."""

    def setUp(self):
        import pyotp

        self.client = APIClient()
        self.secret = pyotp.random_base32()
        self.user = User.objects.create_user(
            email='totplogin@test.com',
            login_42='totploginuser',
            role='STUDENT',
            totp_enabled=True,
            totp_secret=self.secret,
        )

    def _preauth(self):
        from apps.users.tokens import PreAuth2FAToken
        return str(PreAuth2FAToken.for_user(self.user))

    def test_valid_code_issues_access_token_and_refresh_cookie(self):
        import pyotp

        code = pyotp.TOTP(self.secret).now()
        response = self.client.post(
            '/api/v1/auth/2fa/login-verify/',
            {'preauth': self._preauth(), 'code': code},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertIn('fleetmark_refresh', response.cookies)
        self.assertTrue(response.cookies['fleetmark_refresh']['httponly'])

    def test_invalid_code_rejected(self):
        response = self.client.post(
            '/api/v1/auth/2fa/login-verify/',
            {'preauth': self._preauth(), 'code': '000000'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('fleetmark_refresh', response.cookies)

    def test_garbage_preauth_token_rejected(self):
        import pyotp

        code = pyotp.TOTP(self.secret).now()
        response = self.client.post(
            '/api/v1/auth/2fa/login-verify/',
            {'preauth': 'not-a-real-token', 'code': code},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_access_token_is_not_accepted_as_preauth(self):
        # A normal access token has token_type='access', not 'preauth_2fa' —
        # it must not work here even though it's a validly-signed JWT.
        import pyotp
        from rest_framework_simplejwt.tokens import RefreshToken

        code = pyotp.TOTP(self.secret).now()
        real_access = str(RefreshToken.for_user(self.user).access_token)
        response = self.client.post(
            '/api/v1/auth/2fa/login-verify/',
            {'preauth': real_access, 'code': code},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutViewTest(TestCase):
    """Tests for POST /api/v1/auth/logout/"""

    def setUp(self):
        self.client = APIClient()

    def test_logout_clears_refresh_cookie(self):
        self.client.cookies['fleetmark_refresh'] = 'some-refresh-token'
        response = self.client.post('/api/v1/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies['fleetmark_refresh'].value, '')


class ProfileViewTest(TestCase):
    """Tests for GET/PATCH /api/v1/auth/me/"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='profile@test.com',
            password='testpass123',
            login_42='profileuser',
            role='STUDENT',
        )
        self.station = Station.objects.create(name='Station Alpha')

    def test_unauthenticated_returns_401(self):
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_profile_returns_user_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/auth/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'profile@test.com')
        self.assertEqual(response.data['login_42'], 'profileuser')
        self.assertEqual(response.data['role'], 'STUDENT')

    def test_patch_station_updates_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            '/api/v1/auth/me/',
            {'station': str(self.station.id)},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['station']), str(self.station.id))
        self.assertEqual(response.data['station_name'], 'Station Alpha')

    def test_cannot_change_role_via_patch(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            '/api/v1/auth/me/',
            {'role': 'LOGISTICS_STAFF'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Role should remain STUDENT because it's read-only
        self.assertEqual(response.data['role'], 'STUDENT')

    def test_cannot_change_email_via_patch(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            '/api/v1/auth/me/',
            {'email': 'hacked@evil.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Email should not change
        self.assertEqual(response.data['email'], 'profile@test.com')


class PermissionsTest(TestCase):
    """Tests for custom permission classes."""

    def setUp(self):
        self.client = APIClient()

    def test_logistics_staff_can_access_profile(self):
        user = User.objects.create_user(
            email='staff@test.com',
            password='testpass123',
            role='LOGISTICS_STAFF',
        )
        self.client.force_authenticate(user=user)
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_driver_can_access_profile(self):
        user = User.objects.create_user(
            email='driver@test.com',
            password='testpass123',
            role='DRIVER',
        )
        self.client.force_authenticate(user=user)
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class UserAdminTest(TestCase):
    """Staff user management: role changes and self-lockout protection."""

    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(email='boss@test.com', password='x', login_42='boss', role='LOGISTICS_STAFF')
        self.student = User.objects.create_user(email='kid@test.com', password='x', login_42='kid', role='STUDENT')
        self.client.force_authenticate(user=self.staff)

    def test_promote_student_syncs_is_staff(self):
        resp = self.client.patch(f'/api/v1/auth/users/{self.student.id}/', {'role': 'LOGISTICS_STAFF'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_staff)

    def test_staff_cannot_demote_or_deactivate_self(self):
        for payload in ({'role': 'STUDENT'}, {'is_active': False}):
            resp = self.client.patch(f'/api/v1/auth/users/{self.staff.id}/', payload, format='json')
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.role, 'LOGISTICS_STAFF')

    def test_2fa_setup_returns_qr_code(self):
        resp = self.client.post('/api/v1/auth/2fa/setup/')
        self.assertTrue(resp.data['qr_code'].startswith('data:image/svg+xml;base64,'))

    def test_browser_oauth_failure_redirects_to_landing(self):
        resp = self.client.get('/api/v1/auth/42/callback/', HTTP_ACCEPT='text/html')
        self.assertEqual(resp.status_code, 302)
        self.assertIn('/?auth_error=denied', resp['Location'])


class BlockedUserLoginTest(TestCase):
    """A user blocked from Users & Roles must not get a session from 42 OAuth."""

    @patch('apps.users.views.requests.get')
    @patch('apps.users.views.requests.post')
    def test_inactive_user_is_sent_back_with_blocked_error(self, mock_post, mock_get):
        User.objects.create_user(email='gone@student.42.fr', password='x', login_42='gone42', is_active=False)
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {'access_token': 't'})
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {'login': 'gone42', 'email': 'gone@student.42.fr'})
        client = APIClient()
        client.cookies['fleetmark_oauth_state'] = 's'
        resp = client.get('/api/v1/auth/42/callback/', {'code': 'c', 'state': 's'}, HTTP_ACCEPT='text/html')
        self.assertEqual(resp.status_code, 302)
        self.assertIn('/?auth_error=blocked', resp['Location'])
        self.assertNotIn('fleetmark_refresh', resp.cookies)


class AccessRevocationTest(TestCase):
    def test_blocked_user_cannot_refresh_session(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        user = User.objects.create_user(email='b@test.com', password='x', login_42='blk')
        client = APIClient()
        client.cookies['fleetmark_refresh'] = str(RefreshToken.for_user(user))
        user.is_active = False
        user.save()
        self.assertEqual(client.post('/api/v1/auth/token/refresh/').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_cannot_delete_users_through_admin_api(self):
        staff = User.objects.create_user(email='s@test.com', password='x', login_42='st', role='LOGISTICS_STAFF')
        client = APIClient()
        client.force_authenticate(user=staff)
        self.assertEqual(client.delete(f'/api/v1/auth/users/{staff.id}/').status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class TOTPAbuseTest(TestCase):
    def setUp(self):
        import pyotp
        from django.core.cache import cache
        cache.clear()
        self.secret = pyotp.random_base32()
        self.user = User.objects.create_user(email='t@test.com', password='x', login_42='totp1')
        self.user.totp_secret = self.secret
        self.user.save()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_locks_after_five_wrong_codes(self):
        for _ in range(5):
            self.client.post('/api/v1/auth/2fa/verify/', {'code': '000000'}, format='json')
        import pyotp
        good = pyotp.TOTP(self.secret).now()
        resp = self.client.post('/api/v1/auth/2fa/verify/', {'code': good}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_a_code_cannot_be_used_twice(self):
        import pyotp
        good = pyotp.TOTP(self.secret).now()
        self.assertEqual(self.client.post('/api/v1/auth/2fa/verify/', {'code': good}, format='json').status_code, 200)
        self.assertEqual(self.client.post('/api/v1/auth/2fa/verify/', {'code': good}, format='json').status_code, 400)
