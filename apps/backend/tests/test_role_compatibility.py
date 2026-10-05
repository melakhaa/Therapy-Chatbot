import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[3]
AUTH_INIT = (ROOT / "db/init/02_auth.sql").read_text(encoding="utf-8").lower()
MIGRATION_002 = (ROOT / "db/migrations/002_iteration4.sql").read_text(encoding="utf-8").lower()
MIGRATION_003 = (ROOT / "db/migrations/003_iteration4_1.sql").read_text(encoding="utf-8").lower()
MIGRATION_004 = (ROOT / "db/migrations/004_backend_enablement.sql").read_text(encoding="utf-8").lower()


class LegacyRoleCompatibilityContracts(unittest.TestCase):
    def test_fresh_auth_initialization_bridges_legacy_grants(self):
        self.assertIn("create role sanctuary_app nologin nosuperuser", AUTH_INIT)
        self.assertIn("grant sanctuary_app to sajiwa_app with inherit true", AUTH_INIT)

    def test_historical_migration_role_references_remain_preserved(self):
        self.assertIn("assessment_category_results to sanctuary_app", MIGRATION_002)
        self.assertIn("notify_dass21_admins(uuid) to sanctuary_app", MIGRATION_003)

    def test_migration_004_bridges_upgrades_and_grants_new_objects_to_canonical_role(self):
        self.assertIn("grant sanctuary_app to sajiwa_app with inherit true", MIGRATION_004)
        self.assertIn("counseling_resource_blocks to sajiwa_app", MIGRATION_004)
        self.assertNotIn("counseling_resource_blocks to sanctuary_app", MIGRATION_004)


if __name__ == "__main__":
    unittest.main()
