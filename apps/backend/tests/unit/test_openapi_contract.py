"""Guards the published API contract while C400 documentation is consolidated.

The documentation plan groups operations by resource family for the report and ReDoc.
That grouping is presentation only: it must never move, add, or remove an operation.
The inventory below is the approved operation set from the plan's verified contract.
"""
import os
import sys
import types
import unittest

os.environ.setdefault("JWT_SECRET", "isolated-openapi-contract-key-not-for-real-sessions")
fake_db = sys.modules.get("core.db") or types.ModuleType("core.db")
fake_db.query = lambda *args, **kwargs: []
fake_db.db = None
sys.modules["core.db"] = fake_db

import main

INVENTORY = {
    "/": ["GET"],
    "/accounts": ["GET", "POST"],
    "/accounts/konselor": ["GET"],
    "/accounts/{user_id}": ["DELETE", "PUT"],
    "/admin/academic/faculties": ["GET", "POST"],
    "/admin/academic/faculties/{faculty_id}": ["PUT"],
    "/admin/academic/units": ["GET", "POST"],
    "/admin/academic/units/{unit_id}": ["PUT"],
    "/admin/assessment-instruments": ["GET", "POST"],
    "/admin/assessment-instruments/dass21-variants": ["POST"],
    "/admin/assessment-instruments/versions/{version_id}": ["GET"],
    "/admin/assessment-instruments/versions/{version_id}/draft": ["PUT"],
    "/admin/assessment-instruments/versions/{version_id}/publish": ["POST"],
    "/admin/assessment-instruments/versions/{version_id}/submit-review": ["POST"],
    "/admin/assessment-instruments/versions/{version_id}/validate": ["POST"],
    "/admin/assessment-instruments/{instrument_id}/derived": ["POST"],
    "/admin/assessment-instruments/{instrument_id}/drafts": ["POST"],
    "/admin/assessment-instruments/{instrument_id}/shown-in-app": ["PUT"],
    "/admin/assessments": ["GET"],
    "/admin/attention": ["GET"],
    "/admin/attention/{guardrail_log_id}/read": ["PATCH"],
    "/admin/analytics": ["GET"],
    "/admin/analytics/comparison": ["GET"],
    "/admin/analytics/scoped": ["GET"],
    "/admin/counseling/appointments/{counseling_appointment_id}": ["PATCH"],
    "/admin/counseling/availability": ["GET", "POST"],
    "/admin/counseling/availability/{rule_id}": ["DELETE"],
    "/admin/counseling/blocked-periods": ["POST"],
    "/admin/counseling/blocked-periods/{block_id}": ["DELETE"],
    "/admin/counseling/calendar": ["GET"],
    "/admin/counseling/calendar/multi": ["GET"],
    "/admin/counseling/counselors/{counselor_id}/availability": ["PUT"],
    "/admin/counseling/exception-requests": ["GET"],
    "/admin/counseling/exception-requests/{exception_request_id}/approve": ["POST"],
    "/admin/counseling/exception-requests/{exception_request_id}/reject": ["POST"],
    "/admin/counseling/notes": ["POST"],
    "/admin/counseling/requests": ["GET"],
    "/admin/counseling/requests/{request_id}/assign": ["POST"],
    "/admin/counseling/resources": ["GET", "POST"],
    "/admin/counseling/resources/{counseling_resource_id}/blocks": ["POST"],
    "/admin/counselors": ["GET"],
    "/admin/counselors/{counselor_id}/profile": ["PUT"],
    "/admin/hotlines": ["GET", "POST"],
    "/admin/hotlines/{hotline_id}": ["DELETE", "PUT"],
    "/admin/notifications": ["GET"],
    "/admin/notifications/mark-all-read": ["POST"],
    "/admin/notifications/{admin_notification_id}/read": ["PATCH"],
    "/admin/reports/audits": ["POST"],
    "/admin/reports/data": ["GET"],
    "/admin/schedules": ["GET", "POST"],
    "/admin/schedules/{schedule_id}": ["PATCH"],
    "/admin/students": ["GET"],
    "/admin/students/{student_id}/academic-profile": ["PUT"],
    "/admin/students/{student_id}/profile": ["PUT"],
    "/admin/users/{user_id}": ["GET"],
    "/admin/users/{user_id}/assessments": ["GET"],
    "/admin/users/{user_id}/bookings": ["GET"],
    "/assessment/history": ["GET"],
    "/assessment/instrument/active": ["GET"],
    "/assessment/instrument/submit": ["POST"],
    "/assessment/notify-risk": ["POST"],
    "/assessment/submit": ["POST"],
    "/auth/consent": ["GET", "POST"],
    "/auth/login": ["POST"],
    "/auth/me": ["GET"],
    "/auth/register": ["POST"],
    "/auth/reset-password/confirm": ["POST"],
    "/auth/reset-password/request": ["POST"],
    "/booking": ["POST"],
    "/booking/masuk": ["GET"],
    "/booking/saya": ["GET"],
    "/booking/{counseling_booking_id}": ["PATCH"],
    "/chat": ["POST"],
    "/chat/history": ["GET"],
    "/chat/report": ["POST"],
    "/chat/sessions": ["GET"],
    "/chat/stream": ["POST"],
    "/counseling/appointments": ["GET"],
    "/counseling/requests": ["GET", "POST"],
    "/counseling/slots": ["GET"],
    "/counselor/calendar": ["GET"],
    "/counselor/cases": ["GET"],
    "/counselor/cases/{student_id}": ["GET"],
    "/counselor/exception-requests": ["POST"],
    "/counselor/instrument-reviews": ["GET"],
    "/counselor/instrument-reviews/{assessment_version_review_id}": ["GET"],
    "/counselor/instrument-reviews/{assessment_version_review_id}/approve": ["POST"],
    "/counselor/instrument-reviews/{assessment_version_review_id}/comments": ["POST"],
    "/counselor/instrument-reviews/{assessment_version_review_id}/request-revision": ["POST"],
    "/counselor/profile": ["GET"],
    "/dashboard/data": ["GET"],
    "/guardrail/check": ["POST"],
    "/guardrail/hotline": ["GET"],
    "/health": ["GET"],
    "/jadwal": ["GET", "POST"],
    "/jadwal/saya": ["GET"],
    "/jadwal/{counseling_slot_id}": ["PATCH"],
    "/journal": ["GET", "POST"],
    "/journal/today": ["GET"],
    "/journal/{journal_id}": ["DELETE", "PATCH"],
    "/notifications": ["GET"],
    "/notifications/mark-all-read": ["POST"],
    "/notifications/{notification_id}/read": ["PATCH"],
    "/rag/context": ["POST"],
    "/router/intent": ["POST"],
}

# Report/ReDoc navigation order, matching the approved C400 overview.
HTTP_GROUPS = [
    "Assessment",
    "Notifications",
    "Guardrail",
    "Intent Router",
    "RAG",
    "Chat",
    "Auth",
    "Accounts",
    "Dashboard",
    "Jadwal (legacy)",
    "Booking (legacy)",
    "Journal",
    "Admin: Assessments",
    "Admin: Users",
    "Admin: Attention",
    "Admin: Schedules",
    "Admin: Hotlines",
    "Admin: Analytics",
    "Admin: Faculties",
    "Admin: Academic Units",
    "Admin: Students",
    "Admin: Notifications",
    "Admin: Counseling",
    "Admin: Counselors",
    "Admin: Reports",
    "Counseling",
    "Admin: Assessment Instruments",
    "Counselor: Instrument Reviews",
    "Counselor: Profile",
    "Counselor: Cases",
    "Counselor: Calendar",
    "Counselor: Exception Requests",
    "Health",
]

FAMILY_PREFIXES = {
    "/assessment": "Assessment",
    "/notifications": "Notifications",
    "/guardrail": "Guardrail",
    "/router": "Intent Router",
    "/rag": "RAG",
    "/chat": "Chat",
    "/auth": "Auth",
    "/accounts": "Accounts",
    "/dashboard": "Dashboard",
    "/jadwal": "Jadwal (legacy)",
    "/booking": "Booking (legacy)",
    "/journal": "Journal",
    "/admin/assessments": "Admin: Assessments",
    "/admin/users": "Admin: Users",
    "/admin/attention": "Admin: Attention",
    "/admin/schedules": "Admin: Schedules",
    "/admin/hotlines": "Admin: Hotlines",
    "/admin/analytics": "Admin: Analytics",
    "/admin/academic/faculties": "Admin: Faculties",
    "/admin/academic/units": "Admin: Academic Units",
    "/admin/students": "Admin: Students",
    "/admin/notifications": "Admin: Notifications",
    "/admin/counseling": "Admin: Counseling",
    "/admin/counselors": "Admin: Counselors",
    "/admin/reports": "Admin: Reports",
    "/counseling": "Counseling",
    "/admin/assessment-instruments": "Admin: Assessment Instruments",
    "/counselor/instrument-reviews": "Counselor: Instrument Reviews",
    "/counselor/profile": "Counselor: Profile",
    "/counselor/cases": "Counselor: Cases",
    "/counselor/calendar": "Counselor: Calendar",
    "/counselor/exception-requests": "Counselor: Exception Requests",
}


def expected_tag(path):
    if path in ("/", "/health"):
        return "Health"
    for prefix in sorted(FAMILY_PREFIXES, key=len, reverse=True):
        if path == prefix or path.startswith(prefix + "/"):
            return FAMILY_PREFIXES[prefix]
    return None


class OpenAPIContractTests(unittest.TestCase):
    def setUp(self):
        self.spec = main.app.openapi()

    def operations(self):
        return {
            path: sorted(m.upper() for m in item if m in ("get", "post", "put", "patch", "delete"))
            for path, item in self.spec["paths"].items()
        }

    def test_operation_set_is_unchanged(self):
        self.assertEqual(self.operations(), INVENTORY)
        self.assertEqual(sum(len(m) for m in INVENTORY.values()), 120)

    def test_every_operation_carries_its_approved_family_tag(self):
        for path, item in self.spec["paths"].items():
            for method, operation in item.items():
                if method not in ("get", "post", "put", "patch", "delete"):
                    continue
                self.assertEqual(
                    operation.get("tags"), [expected_tag(path)],
                    f"{method.upper()} {path}",
                )

    def test_redoc_navigation_lists_exactly_the_approved_groups(self):
        names = [group["name"] for group in main.app.openapi_tags]
        self.assertEqual(names, HTTP_GROUPS + ["Realtime"])


if __name__ == "__main__":
    unittest.main()
