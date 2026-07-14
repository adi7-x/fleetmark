import hmac
import os

from rest_framework.permissions import BasePermission


class HasAPIKey(BasePermission):
    """Allow access only to requests that include a valid X-API-Key header."""

    def has_permission(self, request, view):
        api_key = request.headers.get('X-API-Key', '')
        expected_key = os.environ.get('SSBS_API_KEY', '')
        if not api_key or not expected_key:
            return False
        # Constant-time comparison to avoid leaking the key via timing.
        return hmac.compare_digest(api_key, expected_key)


class HasAPIKeyOrIsAuthenticated(BasePermission):
    """Public-API access: a valid X-API-Key OR an authenticated session.

    Applied to the documented read-only public endpoints (see docs/PUBLIC_API.md)
    so external clients can authenticate with the API key while the browser SPA
    continues to use its JWT.
    """

    def has_permission(self, request, view):
        if HasAPIKey().has_permission(request, view):
            return True
        return bool(request.user and request.user.is_authenticated)


class IsLogisticsStaff(BasePermission):
    """Allow access only to users with role=LOGISTICS_STAFF."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'LOGISTICS_STAFF'
        )


class IsStudent(BasePermission):
    """Allow access only to users with role=STUDENT."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'STUDENT'
        )


class IsDriver(BasePermission):
    """Allow access only to users with role=DRIVER."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'DRIVER'
        )


class IsLogisticsStaffOrReadOnly(BasePermission):
    """Staff can do anything; others can only read (GET, HEAD, OPTIONS)."""

    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'LOGISTICS_STAFF'
        )
