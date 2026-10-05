from django.conf import settings
from rest_framework import serializers

from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    """Read/update serializer for the authenticated user's profile."""
    station_name = serializers.CharField(source='station.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'id',
            'login_42',
            'email',
            'role',
            'station',
            'station_name',
            'avatar_url',
            'is_active',
            'totp_enabled',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'login_42',
            'email',
            'role',
            'avatar_url',
            'is_active',
            'totp_enabled',
            'created_at',
        ]


class UserAdminSerializer(serializers.ModelSerializer):
    """Serializer for logistics staff to view, edit, and delete users."""
    station_name = serializers.CharField(source='station.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'id',
            'login_42',
            'email',
            'role',
            'station',
            'station_name',
            'avatar_url',
            'is_active',
            'totp_enabled',
            'created_at',
        ]
        read_only_fields = ['id', 'login_42', 'email', 'avatar_url', 'totp_enabled', 'created_at']

    def validate(self, attrs):
        request = self.context.get('request')
        changes_access = self.instance is not None and (
            attrs.get('role', self.instance.role) != self.instance.role or attrs.get('is_active') is False
        )
        if changes_access and request and self.instance.pk == request.user.pk:
            raise serializers.ValidationError('You cannot change your own role or deactivate yourself.')
        root = getattr(settings, 'ADMIN_42_LOGIN', '')
        if changes_access and root and self.instance.login_42 == root:
            raise serializers.ValidationError('The main administrator account cannot be demoted or blocked.')
        return attrs

    def update(self, instance, validated_data):
        if 'role' in validated_data:
            validated_data['is_staff'] = validated_data['role'] == 'LOGISTICS_STAFF'
        return super().update(instance, validated_data)


class TokenResponseSerializer(serializers.Serializer):
    """Schema-only serializer for the JWT token response (used for docs).

    The refresh token is never in the response body — it's set as an
    HttpOnly cookie. See CookieTokenRefreshView / TOTPLoginVerifyView.
    """
    access = serializers.CharField()
    user = UserSerializer()
    totp_required = serializers.BooleanField()


class OAuth42LoginSerializer(serializers.Serializer):
    """Schema-only serializer for the OAuth login redirect URL."""
    authorization_url = serializers.URLField()
