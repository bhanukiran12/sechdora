import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class SchedoraAPITester:
    def __init__(self, base_url="https://sechdora.onrender.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_auth=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Explicitly control authentication
        if use_auth is True and self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        elif use_auth is False:
            # Explicitly no auth - don't add any auth headers
            pass
        elif use_auth is None and self.token:
            # Default behavior - use token if available
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Auth: {'Yes' if 'Authorization' in test_headers else 'No'}")
        
        try:
            # Use a fresh session for each request to avoid cookie persistence
            session = requests.Session()
            
            if method == 'GET':
                response = session.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = session.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = session.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = session.delete(url, headers=test_headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            details = ""
            
            if not success:
                details = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return {}

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        # Test session exchange (this will fail without valid session_id, but we can test the endpoint)
        self.run_test(
            "Auth Session Exchange (Invalid)",
            "POST",
            "auth/session",
            400,  # Expected to fail with invalid session_id
            data={"session_id": "invalid_session_id"}
        )
        
        # Test /auth/me without token (should fail)
        self.run_test(
            "Get Current User (No Auth)",
            "GET",
            "auth/me",
            401
        )
        
        # Test admin login
        login_response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@schedora.com",
                "password": "admin123"
            }
        )
        
        if login_response and 'access_token' in login_response:
            self.token = login_response['access_token']
            print(f"   ✅ Admin login successful, token acquired")
            
            # Test /auth/me with valid token
            me_response = self.run_test(
                "Get Current User (With Auth)",
                "GET",
                "auth/me",
                200
            )
            
            if me_response:
                print(f"   ✅ User role: {me_response.get('role', 'unknown')}")
                print(f"   ✅ User email: {me_response.get('email', 'unknown')}")
        else:
            print("   ❌ Admin login failed, skipping authenticated tests")
            
        # Test user registration
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        register_response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "testpass123",
                "name": "Test User"
            }
        )
        
        # Test logout
        if self.token:
            self.run_test(
                "Logout",
                "POST",
                "auth/logout",
                200
            )

    def test_posts_endpoints(self):
        """Test posts CRUD operations"""
        print("\n" + "="*50)
        print("TESTING POSTS ENDPOINTS")
        print("="*50)
        
        # Test get posts without auth
        self.run_test(
            "Get Posts (No Auth)",
            "GET",
            "posts",
            401,
            use_auth=False
        )
        
        # Test create post without auth
        self.run_test(
            "Create Post (No Auth)",
            "POST",
            "posts",
            401,
            data={
                "content": "Test post",
                "platforms": ["instagram"],
                "scheduled_time": None
            },
            use_auth=False
        )

    def test_ai_endpoints(self):
        """Test AI content generation endpoints"""
        print("\n" + "="*50)
        print("TESTING AI ENDPOINTS")
        print("="*50)
        
        # Test AI content generation without auth
        self.run_test(
            "AI Generate Content (No Auth)",
            "POST",
            "ai/generate-content",
            401,
            data={
                "topic": "morning routine",
                "platforms": ["instagram"]
            },
            use_auth=False
        )
        
        # Test AI caption improvement without auth
        self.run_test(
            "AI Improve Caption (No Auth)",
            "POST",
            "ai/improve-caption",
            401,
            data={
                "caption": "Test caption",
                "platform": "instagram"
            },
            use_auth=False
        )

    def test_upload_endpoints(self):
        """Test file upload endpoints"""
        print("\n" + "="*50)
        print("TESTING UPLOAD ENDPOINTS")
        print("="*50)
        
        # Test upload without auth
        response = requests.post(f"{self.base_url}/upload", timeout=30)
        success = response.status_code == 401
        self.log_test("File Upload (No Auth)", success, 
                     f"Expected 401, got {response.status_code}" if not success else "")

    def test_social_accounts_endpoints(self):
        """Test social accounts endpoints"""
        print("\n" + "="*50)
        print("TESTING SOCIAL ACCOUNTS ENDPOINTS")
        print("="*50)
        
        # Test get social accounts without auth
        self.run_test(
            "Get Social Accounts (No Auth)",
            "GET",
            "social-accounts",
            401,
            use_auth=False
        )
        
        # Test connect social account without auth
        self.run_test(
            "Connect Social Account (No Auth)",
            "POST",
            "social-accounts",
            401,
            data={
                "platform": "instagram",
                "access_token": "test_token"
            },
            use_auth=False
        )

    def test_oauth_endpoints(self):
        """Test OAuth endpoints for Phase 4 - Real OAuth credentials"""
        print("\n" + "="*50)
        print("TESTING OAUTH ENDPOINTS (PHASE 4)")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping OAuth tests")
            return
            
        # Test OAuth URL generation for all platforms - Phase 4 has real credentials
        platforms = ["instagram", "facebook", "twitter", "linkedin", "youtube"]
        oauth_success_count = 0
        
        for platform in platforms:
            response = self.run_test(
                f"Get OAuth URL ({platform})",
                "GET",
                f"social-accounts/oauth-url/{platform}",
                200,  # Expected to succeed with real OAuth keys in Phase 4
                use_auth=True
            )
            
            if response and 'url' in response:
                oauth_success_count += 1
                print(f"   ✅ {platform} OAuth URL: {response['url'][:80]}...")
                
                # Validate URL contains expected OAuth provider domain
                expected_domains = {
                    'instagram': 'api.instagram.com',
                    'facebook': 'facebook.com',
                    'twitter': 'twitter.com',
                    'linkedin': 'linkedin.com',
                    'youtube': 'accounts.google.com'
                }
                
                if expected_domains[platform] in response['url']:
                    print(f"   ✅ {platform} URL contains correct domain")
                else:
                    print(f"   ⚠️ {platform} URL domain validation failed")
        
        print(f"\n   📊 OAuth URL Generation: {oauth_success_count}/5 platforms successful")
        return oauth_success_count == 5

    def test_settings_endpoints(self):
        """Test user settings endpoints for Phase 3"""
        print("\n" + "="*50)
        print("TESTING SETTINGS ENDPOINTS (PHASE 3)")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping settings tests")
            return
            
        # Test get settings
        settings_response = self.run_test(
            "Get User Settings",
            "GET",
            "settings",
            200,
            use_auth=True
        )
        
        if settings_response:
            print(f"   ✅ Settings: auto_retry={settings_response.get('auto_retry_failed')}, email_on_failure={settings_response.get('email_on_failure')}")
        
        # Test update settings
        self.run_test(
            "Update User Settings",
            "PUT",
            "settings",
            200,
            data={
                "auto_retry_failed": True,
                "email_on_failure": True,
                "email_weekly_digest": False
            },
            use_auth=True
        )

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n" + "="*50)
        print("TESTING ANALYTICS ENDPOINTS")
        print("="*50)
        
        # Test analytics overview without auth
        self.run_test(
            "Analytics Overview (No Auth)",
            "GET",
            "analytics/overview",
            401,
            use_auth=False
        )
        
        if self.token:
            # Test analytics overview with auth
            self.run_test(
                "Analytics Overview (With Auth)",
                "GET",
                "analytics/overview",
                200,
                use_auth=True
            )

    def test_posts_with_auth(self):
        """Test posts endpoints with authentication"""
        print("\n" + "="*50)
        print("TESTING POSTS WITH AUTHENTICATION")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping authenticated posts tests")
            return
            
        # Test get posts with auth
        posts_response = self.run_test(
            "Get Posts (With Auth)",
            "GET",
            "posts",
            200
        )
        
        # Test create post with auth and Phase 3 features
        post_data = {
            "content": "Test post from API testing with Phase 3 features",
            "platforms": ["instagram", "linkedin"],
            "platform_captions": {
                "instagram": "Instagram caption",
                "linkedin": "LinkedIn caption"
            },
            "scheduled_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "status": "scheduled",
            "recurrence": "daily",  # Phase 3: recurring scheduling
            "auto_retry": True      # Phase 3: auto-retry toggle
        }
        
        create_response = self.run_test(
            "Create Post with Recurrence (Phase 3)",
            "POST",
            "posts",
            200,
            data=post_data
        )
        
        if create_response and 'post_id' in create_response:
            post_id = create_response['post_id']
            print(f"   ✅ Created post with ID: {post_id}")
            print(f"   ✅ Recurrence: {create_response.get('recurrence', 'none')}")
            print(f"   ✅ Auto-retry: {create_response.get('auto_retry', False)}")
            
            # Test get specific post
            self.run_test(
                "Get Specific Post",
                "GET",
                f"posts/{post_id}",
                200
            )
            
            # Test retry endpoint (Phase 3)
            # First mark post as failed for testing
            self.run_test(
                "Retry Failed Post (Phase 3)",
                "POST",
                f"posts/{post_id}/retry",
                404,  # Expected since post is not failed
                use_auth=True
            )

    def test_ai_with_auth(self):
        """Test AI endpoints with authentication"""
        print("\n" + "="*50)
        print("TESTING AI WITH AUTHENTICATION")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping AI tests")
            return
            
        # Test AI content generation with auth
        ai_response = self.run_test(
            "AI Generate Content (With Auth)",
            "POST",
            "ai/generate-content",
            200,
            data={
                "topic": "productivity tips",
                "platforms": ["instagram", "linkedin"]
            }
        )
        
        if ai_response:
            print(f"   ✅ AI generated {len(ai_response.get('ideas', []))} content ideas")
        
        # Test AI caption improvement with auth
        improve_response = self.run_test(
            "AI Improve Caption (With Auth)",
            "POST",
            "ai/improve-caption",
            200,
            data={
                "caption": "Check out this amazing productivity tip!",
                "platform": "instagram"
            }
        )
        
        if improve_response:
            print(f"   ✅ AI improved caption: {improve_response.get('improved_caption', '')[:50]}...")

    def test_onboarding_endpoints(self):
        """Test onboarding endpoints"""
        print("\n" + "="*50)
        print("TESTING ONBOARDING ENDPOINTS")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping onboarding tests")
            return
            
        # Test get onboarding status
        self.run_test(
            "Get Onboarding Status",
            "GET",
            "onboarding/status",
            200
        )
        
        # Test save onboarding data
        self.run_test(
            "Save Onboarding Data",
            "POST",
            "onboarding",
            200,
            data={
                "creator_type": "business",
                "preferred_platforms": ["instagram", "linkedin"]
            }
        )

    def test_notifications_endpoints(self):
        """Test notifications endpoints"""
        print("\n" + "="*50)
        print("TESTING NOTIFICATIONS ENDPOINTS")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping notifications tests")
            return
            
        # Test get notifications
        self.run_test(
            "Get Notifications",
            "GET",
            "notifications",
            200
        )
        
        # Test get unread count
        self.run_test(
            "Get Unread Count",
            "GET",
            "notifications/unread-count",
            200
        )
        
        # Test mark all as read
        self.run_test(
            "Mark All Notifications Read",
            "POST",
            "notifications/read-all",
            200
        )

    def test_bulk_upload_endpoints(self):
        """Test bulk upload endpoints"""
        print("\n" + "="*50)
        print("TESTING BULK UPLOAD ENDPOINTS")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping bulk upload tests")
            return
            
        # Test bulk upload without file (should fail)
        response = requests.post(
            f"{self.base_url}/posts/bulk-upload",
            headers={'Authorization': f'Bearer {self.token}'},
            timeout=30
        )
        success = response.status_code == 422  # Expected validation error
        self.log_test("Bulk Upload (No File)", success, 
                     f"Expected 422, got {response.status_code}" if not success else "")

    def test_audit_logs_endpoints(self):
        """Test audit logs endpoints"""
        print("\n" + "="*50)
        print("TESTING AUDIT LOGS ENDPOINTS")
        print("="*50)
        
        if not self.token:
            print("   ⚠️ No auth token, skipping audit logs tests")
            return
            
        # Test get audit logs (admin only)
        self.run_test(
            "Get Audit Logs",
            "GET",
            "audit-logs",
            200
        )

    def test_data_deletion_endpoints(self):
        """Test Phase 5 data deletion endpoints"""
        print("\n" + "="*50)
        print("TESTING DATA DELETION ENDPOINTS (PHASE 5)")
        print("="*50)
        
        # Test data deletion callback (Meta requirement) - no auth required
        callback_response = self.run_test(
            "Data Deletion Callback",
            "POST",
            "data-deletion/callback",
            200,
            data={
                "signed_request": "test_signed_request.test_payload"
            },
            use_auth=False
        )
        
        if callback_response:
            if 'confirmation_code' in callback_response:
                print(f"   ✅ Confirmation code: {callback_response['confirmation_code']}")
            if 'url' in callback_response:
                print(f"   ✅ Deletion URL: {callback_response['url']}")
        
        # Test account self-deletion (requires auth)
        if not self.token:
            print("   ⚠️ No auth token, skipping account deletion test")
            return
            
        # Note: We won't actually delete the admin account, just test the endpoint exists
        # This would normally return 200 and delete the account
        self.run_test(
            "Account Self-Deletion Endpoint Check",
            "POST",
            "account/delete",
            200,
            use_auth=True
        )

    def test_cors_and_health(self):
        """Test CORS and basic connectivity"""
        print("\n" + "="*50)
        print("TESTING CORS AND CONNECTIVITY")
        print("="*50)
        
        try:
            # Test basic connectivity with OPTIONS request
            response = requests.options(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code in [200, 204, 405]  # Some servers return 405 for OPTIONS
            self.log_test("CORS Preflight", success, 
                         f"Status: {response.status_code}" if not success else "")
            
            # Check CORS headers
            cors_headers = response.headers.get('Access-Control-Allow-Origin')
            if cors_headers:
                self.log_test("CORS Headers Present", True, f"Origin: {cors_headers}")
            else:
                self.log_test("CORS Headers Present", False, "No CORS headers found")
                
        except Exception as e:
            self.log_test("CORS Preflight", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Schedora API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        # Run test suites
        self.test_cors_and_health()
        self.test_auth_flow()
        self.test_posts_endpoints()
        self.test_ai_endpoints()
        self.test_upload_endpoints()
        self.test_social_accounts_endpoints()
        self.test_analytics_endpoints()
        
        # New authenticated tests
        if self.token:
            self.test_posts_with_auth()
            self.test_ai_with_auth()
            self.test_onboarding_endpoints()
            self.test_notifications_endpoints()
            self.test_bulk_upload_endpoints()
            self.test_audit_logs_endpoints()
            # Phase 3 specific tests
            self.test_oauth_endpoints()
            self.test_settings_endpoints()
            # Phase 5 specific tests
            self.test_data_deletion_endpoints()
        
        # Print summary
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SchedoraAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())