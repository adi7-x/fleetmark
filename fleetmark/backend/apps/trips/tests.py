from datetime import datetime, timezone as dt_timezone
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.buses.models import Bus
from apps.drivers.models import Driver
from apps.reservations.models import Reservation
from apps.routes.models import Route, RouteStation
from apps.stations.models import Station
from apps.trips.models import Trip
from apps.users.models import User


class TripAPITests(APITestCase):
	def setUp(self):
		self.list_url = reverse('trip-list-create')
		self.available_url = reverse('trip-available')
		self.station = Station.objects.create(name='Station A')
		self.route_peak = Route.objects.create(name='Route Peak', window='peak')
		RouteStation.objects.create(route=self.route_peak, station=self.station, order=1)
		self.bus = Bus.objects.create(name='Bus 1', plate='TRP-001', seat_capacity=10)
		self.driver = Driver.objects.create(name='Driver Trip', username='driver-trip', password='hash')
		# Create users for different permission levels
		self.logistics_user = User.objects.create_user(
			email='logistics@test.com',
			password='testpass123',
			login_42='logisticsuser',
			role='LOGISTICS_STAFF',
		)
		self.student_user = User.objects.create_user(
			email='student@test.com',
			password='testpass123',
			login_42='studentuser',
			role='STUDENT',
		)

	def test_create_trip(self):
		self.client.force_authenticate(user=self.logistics_user)
		payload = {
			'route': str(self.route_peak.id),
			'bus': str(self.bus.id),
			'driver': str(self.driver.id),
			'departure_datetime': '2026-01-01T20:00:00Z',
		}
		response = self.client.post(self.list_url, payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['seats_left'], self.bus.seat_capacity)

	def _create_trip(self, archived=False):
		trip = Trip.objects.create(
			route=self.route_peak,
			bus=self.bus,
			driver=self.driver,
			departure_datetime='2026-01-01T21:00:00Z',
			archived_at=timezone.now() if archived else None,
		)
		return trip

	@patch('apps.trips.views.localtime')
	@patch('apps.trips.views.now')
	def test_available_trips_returns_results_in_peak_window(self, mock_now, mock_localtime):
		self.client.force_authenticate(user=self.student_user)
		trip = self._create_trip()
		fake_time = datetime(2026, 1, 1, 20, 30, tzinfo=dt_timezone.utc)
		mock_now.return_value = fake_time
		mock_localtime.side_effect = lambda value: fake_time

		response = self.client.get(self.available_url, {'station_id': str(self.station.id)})

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]['id'], str(trip.id))

	@patch('apps.trips.views.localtime')
	@patch('apps.trips.views.now')
	def test_available_trips_returns_tonights_trip_during_daytime(self, mock_now, mock_localtime):
		# Business rule: a student can book tonight's bus during the day
		# (reserve by 9pm for a 1am departure). At 10:00 the upcoming 21:00
		# trip is within tonight's 21:00->06:00 window and must be listed.
		self.client.force_authenticate(user=self.student_user)
		trip = self._create_trip()
		fake_time = datetime(2026, 1, 1, 10, 0, tzinfo=dt_timezone.utc)
		mock_now.return_value = fake_time
		mock_localtime.side_effect = lambda value: fake_time

		response = self.client.get(self.available_url, {'station_id': str(self.station.id)})

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]['id'], str(trip.id))

	@patch('apps.trips.views.localtime')
	@patch('apps.trips.views.now')
	def test_available_trips_empty_for_past_night_window(self, mock_now, mock_localtime):
		# A trip that belongs to a previous night's window must NOT appear:
		# on Jan 2 the window is Jan 2 21:00 -> Jan 3 06:00, so the Jan 1 trip
		# is out of range.
		self.client.force_authenticate(user=self.student_user)
		self._create_trip()  # departs 2026-01-01T21:00:00Z
		fake_time = datetime(2026, 1, 2, 10, 0, tzinfo=dt_timezone.utc)
		mock_now.return_value = fake_time
		mock_localtime.side_effect = lambda value: fake_time

		response = self.client.get(self.available_url, {'station_id': str(self.station.id)})

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data, [])

	def test_available_trips_requires_station_id(self):
		self.client.force_authenticate(user=self.student_user)
		response = self.client.get(self.available_url)
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	@patch('apps.trips.views.localtime')
	@patch('apps.trips.views.now')
	def test_full_trips_are_filtered_out(self, mock_now, mock_localtime):
		self.client.force_authenticate(user=self.student_user)
		self.bus.seat_capacity = 1
		self.bus.save(update_fields=['seat_capacity'])
		trip = self._create_trip()
		user = User.objects.create_user(
			email='student@example.com',
			login_42='student_example',
			role='STUDENT'
		)
		Reservation.objects.create(trip=trip, student=user)
		fake_time = datetime(2026, 1, 1, 20, 30, tzinfo=dt_timezone.utc)
		mock_now.return_value = fake_time
		mock_localtime.side_effect = lambda value: fake_time

		response = self.client.get(self.available_url, {'station_id': str(self.station.id)})

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data, [])

	# ── M4: BulkDeleteTripsView must never wipe the whole table ──────────────
	def test_bulk_delete_requires_confirm(self):
		self.client.force_authenticate(user=self.logistics_user)
		trip = self._create_trip()
		resp = self.client.delete(
			reverse('trip-bulk-delete'), {'ids': [str(trip.id)]}, format='json'
		)
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertTrue(Trip.objects.filter(id=trip.id).exists())

	def test_bulk_delete_rejects_unscoped(self):
		self.client.force_authenticate(user=self.logistics_user)
		self._create_trip()
		resp = self.client.delete(
			reverse('trip-bulk-delete'), {'confirm': True}, format='json'
		)
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(Trip.objects.count(), 1)

	def test_bulk_delete_by_ids_with_confirm(self):
		self.client.force_authenticate(user=self.logistics_user)
		keep = self._create_trip()
		drop = self._create_trip()
		resp = self.client.delete(
			reverse('trip-bulk-delete'),
			{'confirm': True, 'ids': [str(drop.id)]},
			format='json',
		)
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		self.assertFalse(Trip.objects.filter(id=drop.id).exists())
		self.assertTrue(Trip.objects.filter(id=keep.id).exists())

	def test_trip_payload_has_capacity_and_ordered_stops(self):
		RouteStation.objects.create(route=self.route_peak, station=Station.objects.create(name='Station B'), order=2)
		trip = self._create_trip()
		self.client.force_authenticate(user=self.logistics_user)
		resp = self.client.get(reverse('trip-detail', args=[trip.id]))
		self.assertEqual(resp.data['bus_seat_capacity'], 10)
		self.assertEqual(resp.data['route_stops'], ['Station A', 'Station B'])

	def test_staff_can_archive_trip_with_patch(self):
		trip = self._create_trip()
		self.client.force_authenticate(user=self.logistics_user)
		resp = self.client.patch(reverse('trip-detail', args=[trip.id]), {'archived_at': '2026-01-02T00:00:00Z'}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		trip.refresh_from_db()
		self.assertIsNotNone(trip.archived_at)

	def test_bulk_delete_reports_trip_count_not_cascaded_rows(self):
		trip = self._create_trip()
		Reservation.objects.create(trip=trip, student=self.student_user)
		self.client.force_authenticate(user=self.logistics_user)
		resp = self.client.delete(reverse('trip-bulk-delete'), {'confirm': True, 'ids': [str(trip.id)]}, format='json')
		self.assertEqual(resp.data['detail'], 'Deleted 1 trips.')

	def test_cannot_archive_a_trip_that_has_not_departed(self):
		trip = Trip.objects.create(route=self.route_peak, bus=self.bus, driver=self.driver,
			departure_datetime=timezone.now() + timezone.timedelta(days=1))
		self.client.force_authenticate(user=self.logistics_user)
		resp = self.client.patch(reverse('trip-detail', args=[trip.id]), {'archived_at': timezone.now().isoformat()}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
