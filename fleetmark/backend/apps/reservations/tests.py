from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.buses.models import Bus
from apps.drivers.models import Driver
from apps.reservations.models import Reservation
from apps.routes.models import Route
from apps.stations.models import Station
from apps.trips.models import Trip
from apps.users.models import User


class ReservationAPITests(APITestCase):
	def setUp(self):
		self.list_url = reverse('reservation-list-create')
		self.history_url = reverse('reservation-history')
		self.station = Station.objects.create(name='Station Res')
		self.route = Route.objects.create(name='Route Res', window='peak')
		self.bus = Bus.objects.create(name='Bus Res', plate='RES-001', seat_capacity=2)
		self.driver = Driver.objects.create(name='Driver Res', username='driver-res', password='hash')
		self.user = User.objects.create_user(
			email='student1@example.com',
			login_42='student1',
			role='STUDENT'
		)
		self.other_user = User.objects.create_user(
			email='student2@example.com',
			login_42='student2',
			role='STUDENT'
		)
		self.client.force_authenticate(user=self.user)

	def _create_trip(self, archived=False):
		return Trip.objects.create(
			route=self.route,
			bus=self.bus,
			driver=self.driver,
			departure_datetime='2026-01-01T22:00:00Z',
			archived_at=timezone.now() if archived else None,
		)

	def test_create_reservation_success(self):
		trip = self._create_trip()
		payload = {'trip': str(trip.id), 'user_id': str(self.user.id)}
		response = self.client.post(self.list_url, payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(Reservation.objects.filter(id=response.data['id']).exists())

	def test_cannot_reserve_on_behalf_of_another_user(self):
		"""A client-supplied user_id must be ignored — the reservation belongs to request.user (C1 IDOR)."""
		trip = self._create_trip()
		# Authenticated as self.user, but try to attribute the reservation to other_user.
		payload = {'trip': str(trip.id), 'user_id': str(self.other_user.id)}
		response = self.client.post(self.list_url, payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		reservation = Reservation.objects.get(id=response.data['id'])
		self.assertEqual(reservation.student_id, self.user.id)
		self.assertFalse(Reservation.objects.filter(student=self.other_user).exists())

	def test_create_reservation_duplicate_returns_400(self):
		trip = self._create_trip()
		payload = {'trip': str(trip.id), 'user_id': str(self.user.id)}
		self.client.post(self.list_url, payload, format='json')
		response = self.client.post(self.list_url, payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_create_reservation_full_trip_returns_400(self):
		# Create a bus with capacity 1 to test full trip scenario
		small_bus = Bus.objects.create(name='Small Bus', plate='SMALL-001', seat_capacity=1)
		trip = Trip.objects.create(
			route=self.route,
			bus=small_bus,
			driver=self.driver,
			departure_datetime='2026-01-01T22:00:00Z',
		)
		self.client.post(self.list_url, {'trip': str(trip.id), 'user_id': str(self.user.id)}, format='json')
		response = self.client.post(self.list_url, {'trip': str(trip.id), 'user_id': str(self.other_user.id)}, format='json')
		self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)  # CapacityError returns 409

	def test_create_reservation_archived_trip_returns_400(self):
		trip = self._create_trip(archived=True)
		response = self.client.post(self.list_url, {'trip': str(trip.id), 'user_id': str(self.user.id)}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)  # LifecycleError returns 400

	def test_list_active_reservations_filters_archived(self):
		active_trip = self._create_trip()
		archived_trip = self._create_trip(archived=True)
		Reservation.objects.create(trip=active_trip, student=self.user)
		Reservation.objects.create(trip=archived_trip, student=self.user)
		response = self.client.get(self.list_url, {'user_id': str(self.user.id)})
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(str(response.data[0]['trip']), str(active_trip.id))

	def test_history_endpoint_returns_only_archived(self):
		archived_trip = self._create_trip(archived=True)
		Reservation.objects.create(trip=archived_trip, student=self.user)
		response = self.client.get(self.history_url, {'user_id': str(self.user.id)})
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(str(response.data[0]['trip']), str(archived_trip.id))

	def test_cancel_reservation_success(self):
		trip = self._create_trip()
		reservation = Reservation.objects.create(trip=trip, student=self.user)
		url = reverse('reservation-detail', args=[reservation.id])
		response = self.client.delete(url + f'?user_id={self.user.id}')
		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
		self.assertFalse(Reservation.objects.filter(id=reservation.id).exists())

	def test_cancel_reservation_archived_trip_returns_400(self):
		trip = self._create_trip(archived=True)
		reservation = Reservation.objects.create(trip=trip, student=self.user)
		url = reverse('reservation-detail', args=[reservation.id])
		response = self.client.delete(url + f'?user_id={self.user.id}')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)  # LifecycleError returns 400

	def test_cancel_reservation_wrong_user_returns_404(self):
		trip = self._create_trip()
		reservation = Reservation.objects.create(trip=trip, student=self.user)
		self.client.force_authenticate(user=self.other_user) # Authenticate as the wrong user
		url = reverse('reservation-detail', args=[reservation.id])
		response = self.client.delete(url + f'?user_id={self.other_user.id}')
		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

	def test_one_reservation_per_night_across_trips(self):
		"""M5: a student may hold only one reservation per bus-night, even on a
		different trip in the same 21:00->06:00 window."""
		trip_a = self._create_trip()  # departs 2026-01-01T22:00:00Z
		trip_b = Trip.objects.create(
			route=self.route,
			bus=self.bus,
			driver=self.driver,
			departure_datetime='2026-01-02T01:00:00Z',  # same bus-night window
		)
		r1 = self.client.post(self.list_url, {'trip': str(trip_a.id)}, format='json')
		self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
		r2 = self.client.post(self.list_url, {'trip': str(trip_b.id)}, format='json')
		self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(Reservation.objects.filter(student=self.user).count(), 1)

	def test_six_am_trip_counts_as_the_same_night(self):
		# 21:00 and the next morning's 06:00 are one service night: one seat only.
		evening = Trip.objects.create(route=self.route, bus=self.bus, driver=self.driver, departure_datetime='2026-01-01T21:00:00+01:00')
		morning = Trip.objects.create(route=self.route, bus=self.bus, driver=self.driver, departure_datetime='2026-01-02T06:00:00+01:00')
		self.assertEqual(self.client.post(self.list_url, {'trip': str(evening.id)}, format='json').status_code, status.HTTP_201_CREATED)
		resp = self.client.post(self.list_url, {'trip': str(morning.id)}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
