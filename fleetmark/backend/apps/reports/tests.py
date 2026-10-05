from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.reports.models import IncidentReport
from apps.users.models import User


class IncidentReportAPITests(TestCase):
    """Tests for /api/v1/reports/ (IncidentReportViewSet)."""

    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            email='reporter@student.42.fr', login_42='reporter', role='STUDENT',
        )
        self.other_student = User.objects.create_user(
            email='other@student.42.fr', login_42='otherreporter', role='STUDENT',
        )
        self.staff = User.objects.create_user(
            email='staff@fleetmark.local', login_42='staffuser', role='LOGISTICS_STAFF',
        )

    # ── Auth ──────────────────────────────────────────────────────────────
    def test_unauthenticated_cannot_list(self):
        response = self.client.get('/api/v1/reports/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Create ────────────────────────────────────────────────────────────
    def test_student_can_create_report_attributed_to_self(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            '/api/v1/reports/',
            {'category': 'late', 'description': 'Bus was 20 minutes late.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = IncidentReport.objects.get(id=response.data['id'])
        # reporter is taken from request.user, never the request body.
        self.assertEqual(report.reporter_id, self.student.id)
        self.assertEqual(report.status, 'pending')

    def test_reporter_field_in_body_is_ignored(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            '/api/v1/reports/',
            {'category': 'no_show', 'reporter': str(self.other_student.id)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = IncidentReport.objects.get(id=response.data['id'])
        self.assertEqual(report.reporter_id, self.student.id)

    # ── List scoping ──────────────────────────────────────────────────────
    def test_student_sees_only_their_own_reports(self):
        IncidentReport.objects.create(reporter=self.student, category='late')
        IncidentReport.objects.create(reporter=self.other_student, category='full')

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['category'], 'late')
        # reporter_name resolves from login_42 (regression guard: it used to
        # point at a non-existent `username` field and was silently dropped).
        self.assertEqual(response.data[0]['reporter_name'], 'reporter')

    def test_staff_sees_all_reports(self):
        IncidentReport.objects.create(reporter=self.student, category='late')
        IncidentReport.objects.create(reporter=self.other_student, category='full')

        self.client.force_authenticate(user=self.staff)
        response = self.client.get('/api/v1/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    # ── Status update permissions ─────────────────────────────────────────
    def test_staff_can_update_status(self):
        report = IncidentReport.objects.create(reporter=self.student, category='late')
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f'/api/v1/reports/{report.id}/', {'status': 'resolved'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.status, 'resolved')

    def test_student_cannot_update_status(self):
        report = IncidentReport.objects.create(reporter=self.student, category='late')
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            f'/api/v1/reports/{report.id}/', {'status': 'resolved'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        report.refresh_from_db()
        self.assertEqual(report.status, 'pending')

    def test_student_cannot_see_other_students_report_detail(self):
        # Object-level scoping: the detail route is filtered by get_queryset,
        # so another student's report is a 404, not a 200.
        report = IncidentReport.objects.create(reporter=self.other_student, category='full')
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/v1/reports/{report.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_create_report_already_resolved(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/v1/reports/', {'category': 'late', 'status': 'resolved'}, format='json')
        self.assertEqual(IncidentReport.objects.get(id=response.data['id']).status, 'pending')

    def test_student_cannot_delete_a_report(self):
        self.client.force_authenticate(user=self.student)
        rid = self.client.post('/api/v1/reports/', {'category': 'late'}, format='json').data['id']
        self.assertEqual(self.client.delete(f'/api/v1/reports/{rid}/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(IncidentReport.objects.filter(id=rid).exists())
