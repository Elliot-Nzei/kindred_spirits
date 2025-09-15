import requests
import json
import time
import random
import string

API_BASE_URL = "http://127.0.0.1:8000"

def generate_random_string(length=10):
    return ''.join(random.choice(string.ascii_lowercase) for i in range(length))

def run_test(test_name, func):
    print(f"--- Running Test: {test_name} ---")
    try:
        func()
        print(f"--- Test '{test_name}' PASSED ---\n")
        return True
    except Exception as e:
        print(f"--- Test '{test_name}' FAILED: {e}---\n")
        return False

def test_register_and_login():
    print("Testing user registration and login...")
    username = f"testuser_{generate_random_string()}"
    email = f"{generate_random_string()}@example.com"
    password = "testpassword123"
    full_name = "Test User"

    # 1. Test Registration
    print(f"Attempting to register user: {username} with email: {email}")
    register_url = f"{API_BASE_URL}/api/register"
    register_payload = {
        "username": username,
        "email": email,
        "password": password,
        "full_name": full_name
    }
    response = requests.post(register_url, json=register_payload)
    response.raise_for_status() # Raise an exception for HTTP errors
    register_data = response.json()
    assert "access_token" in register_data, f"Registration failed: {register_data}"
    print(f"Registration successful. Access Token: {register_data['access_token'][:10]}...")

    # 2. Test Login
    print(f"Attempting to login user: {email}")
    login_url = f"{API_BASE_URL}/api/login"
    login_payload = {
        "username": email, # Assuming login uses email as username
        "password": password
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    response = requests.post(login_url, data=login_payload, headers=headers)
    response.raise_for_status()
    login_data = response.json()
    assert "access_token" in login_data, f"Login failed: {login_data}"
    print(f"Login successful. Access Token: {login_data['access_token'][:10]}...")

    # Store token for subsequent tests
    test_register_and_login.access_token = login_data["access_token"]
    test_register_and_login.username = username
    test_register_and_login.email = email
    print("Registration and Login test completed successfully.")

def test_authenticated_request():
    print("Testing authenticated request...")
    if not hasattr(test_register_and_login, 'access_token'):
        raise Exception("Login test must run first to get access token.")

    token = test_register_and_login.access_token
    headers = {"Authorization": f"Bearer {token}"}
    
    # Assuming there's a protected endpoint like /api/users/me
    protected_url = f"{API_BASE_URL}/api/users/me"
    print(f"Attempting to access protected endpoint: {protected_url}")
    response = requests.get(protected_url, headers=headers)
    response.raise_for_status()
    user_data = response.json()
    assert "username" in user_data, f"Protected endpoint returned unexpected data: {user_data}"
    assert user_data["username"] == test_register_and_login.username, "Authenticated user data mismatch."
    print(f"Authenticated request successful. User: {user_data['username']}")

def test_comments_api():
    print("Testing comments API...")
    if not hasattr(test_register_and_login, 'access_token'):
        raise Exception("Login test must run first to get access token.")

    token = test_register_and_login.access_token
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"} 
    
    # Assuming a post ID exists or can be created/fetched
    # For simplicity, let's assume a dummy post_id = 1 for now.
    # In a real scenario, you'd fetch existing posts or create one.
    post_id = 1 
    comment_content = f"This is a test comment from {test_register_and_login.username} - {generate_random_string()}"

    # 1. Post a comment
    post_comment_url = f"{API_BASE_URL}/api/posts/{post_id}/comments"
    print(f"Attempting to post comment to post {post_id}")
    response = requests.post(post_comment_url, json={"content": comment_content}, headers=headers)
    response.raise_for_status()
    comment_data = response.json()
    assert "id" in comment_data, f"Posting comment failed: {comment_data}"
    assert comment_data["content"] == comment_content, "Comment content mismatch."
    print(f"Comment posted successfully. Comment ID: {comment_data['id']}")
    
    # 2. Fetch comments for the post
    get_comments_url = f"{API_BASE_URL}/api/posts/{post_id}/comments"
    print(f"Attempting to fetch comments for post {post_id}")
    response = requests.get(get_comments_url, headers=headers)
    response.raise_for_status()
    comments_list = response.json()
    assert any(c["content"] == comment_content for c in comments_list), "Posted comment not found in fetched comments."
    print("Comments fetched successfully.")

    # 3. (Optional) Delete the comment - requires a delete endpoint
    # delete_comment_url = f"{API_BASE_URL}/api/comments/{comment_data['id']}"
    # print(f"Attempting to delete comment {comment_data['id']}")
    # response = requests.delete(delete_comment_url, headers=headers)
    # response.raise_for_status()
    # print("Comment deleted successfully.")

    print("Comments API test completed successfully.")

def test_likes_api():
    print("Testing likes API...")
    if not hasattr(test_register_and_login, 'access_token'):
        raise Exception("Login test must run first to get access token.")

    token = test_register_and_login.access_token
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Assuming a post ID exists or can be created/fetched
    post_id = 1 

    # 1. Like a post
    like_post_url = f"{API_BASE_URL}/api/posts/{post_id}/like"
    print(f"Attempting to like post {post_id}")
    response = requests.post(like_post_url, headers=headers)
    response.raise_for_status()
    like_data = response.json()
    assert "message" in like_data and "liked" in like_data["message"].lower(), f"Liking post failed: {like_data}"
    print(f"Post {post_id} liked successfully.")

    # 2. Unlike the post
    unlike_post_url = f"{API_BASE_URL}/api/posts/{post_id}/unlike"
    print(f"Attempting to unlike post {post_id}")
    response = requests.post(unlike_post_url, headers=headers)
    response.raise_for_status()
    unlike_data = response.json()
    assert "message" in unlike_data and "unliked" in unlike_data["message"].lower(), f"Unliking post failed: {unlike_data}"
    print(f"Post {post_id} unliked successfully.")

    print("Likes API test completed successfully.")

def cleanup_test_user():
    print("Attempting to clean up test user...")
    if not hasattr(test_register_and_login, 'access_token') or not hasattr(test_register_and_login, 'email'):
        print("No test user to clean up or token/email not found.")
        return

    token = test_register_and_login.access_token
    email = test_register_and_login.email
    headers = {"Authorization": f"Bearer {token}"}

    # This assumes there's an admin endpoint or a self-delete endpoint
    # For simplicity, we'll just print a message.
    # In a real app, you'd have an API endpoint to delete a user.
    print(f"Manually delete user with email: {email} from the database if necessary.")
    print("Cleanup complete (manual deletion might be required).")


if __name__ == "__main__":
    print("Starting API tests...\n")
    
    all_passed = True
    
    # Run registration and login test first
    if not run_test("User Registration and Login", test_register_and_login):
        all_passed = False
    
    # Run subsequent tests only if login was successful
    if all_passed:
        if not run_test("Authenticated Request", test_authenticated_request):
            all_passed = False
        if not run_test("Comments API", test_comments_api):
            all_passed = False
        if not run_test("Likes API", test_likes_api):
            all_passed = False

    print("\n--- All Tests Finished ---")
    if all_passed:
        print("All API tests PASSED!")
    else:
        print("Some API tests FAILED!")
    
    # Cleanup
    cleanup_test_user()
