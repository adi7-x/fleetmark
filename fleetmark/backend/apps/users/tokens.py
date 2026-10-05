from datetime import timedelta

from rest_framework_simplejwt.tokens import Token


class PreAuth2FAToken(Token):
    """
    Short-lived token issued by the OAuth callback for a user who has TOTP
    enabled, in place of a real access/refresh pair.

    Its token_type ('preauth_2fa') does not match SimpleJWT's
    AUTH_TOKEN_CLASSES ('access'), so the default JWTAuthentication silently
    rejects it everywhere — it cannot be used as a Bearer token on any
    normal endpoint. The only thing that accepts it is
    TOTPLoginVerifyView, which decodes it manually and exchanges it (plus a
    valid TOTP code) for the real tokens. This is what makes 2FA mandatory
    rather than advisory: no session exists until the code is verified.
    """
    token_type = 'preauth_2fa'
    lifetime = timedelta(minutes=5)
