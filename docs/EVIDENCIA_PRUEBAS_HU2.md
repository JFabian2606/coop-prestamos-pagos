# Evidencia de pruebas HU2 - actualizar socio / estado
Fecha: 2025-11-27 16:54:22
Comando: python manage.py test apps.socios.tests.test_admin_endpoints --verbosity 2

Salida:
Creating test database for alias 'default' ('file:memorydb_default?mode=memory&cache=shared')...
Found 6 test(s).
Operations to perform:
  Synchronize unmigrated apps: corsheaders, drf_spectacular, messages, rest_framework, staticfiles
  Apply all migrations: admin, auth, contenttypes, sessions, socios, usuarios
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0001_initial... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying auth.0008_alter_user_username_max_length... OK
  Applying auth.0009_alter_user_last_name_max_length... OK
  Applying auth.0010_alter_group_name_max_length... OK
  Applying auth.0011_update_proxy_permissions... OK
  Applying auth.0012_alter_user_first_name_max_length... OK
  Applying usuarios.0001_initial... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying sessions.0001_initial... OK
test_list_socios_requires_admin (apps.socios.tests.test_admin_endpoints.SocioAdminEndpointsTests.test_list_socios_requires_admin) ... ok
test_patch_estado_invalid_transition_rejected (apps.socios.tests.test_admin_endpoints.SocioAdminEndpointsTests.test_patch_estado_invalid_transition_rejected) ... ok
test_patch_estado_requires_admin (apps.socios.tests.test_admin_endpoints.SocioAdminEndpointsTests.test_patch_estado_requires_admin) ... ok
test_patch_estado_valid_transition (apps.socios.tests.test_admin_endpoints.SocioAdminEndpointsTests.test_patch_estado_valid_transition) ... ok
test_put_rejects_estado_changes (apps.socios.tests.test_admin_endpoints.SocioAdminEndpointsTests.test_put_rejects_estado_changes) ... ok
test_put_updates_allowed_fields_and_logs_audit (apps.socios.tests.test_admin_endpoints.SocioAdminEndpointsTests.test_put_updates_allowed_fields_and_logs_audit) ... ok

----------------------------------------------------------------------
Ran 6 tests in 10.015s

OK
Destroying test database for alias 'default' ('file:memorydb_default?mode=memory&cache=shared')...
  Applying socios.0001_initial... OK
System check identified no issues (0 silenced).
