from rest_framework import serializers
from apps.reports.models import IncidentReport

class ReportSerializer(serializers.ModelSerializer):
	# The custom User model has no `username` field (USERNAME_FIELD is email);
	# use login_42, which is what identifies a 42 student everywhere else.
	reporter_name = serializers.CharField(source='reporter.login_42', read_only=True)
	trip_details = serializers.SerializerMethodField()

	class Meta:
		model = IncidentReport
		fields = [
			'id', 
			'reporter', 
			'reporter_name',
			'trip', 
			'trip_details',
			'category', 
			'description', 
			'status', 
			'created_at'
		]
		read_only_fields = ['id', 'reporter', 'created_at']

	def get_trip_details(self, obj):
		if not obj.trip:
			return None
		return {
			'departure': obj.trip.departure_datetime,
			'route': obj.trip.route.name,
			'bus': obj.trip.bus.plate if obj.trip.bus else 'TBA'
		}
