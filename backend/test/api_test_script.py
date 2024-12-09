import requests
import os
from pathlib import Path
import base64

class APITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.test_results = []

    def run_test(self, test_name, test_func):
        try:
            test_func()
            self.test_results.append(f"✅ {test_name}: Passed")
            print(f"✅ {test_name}: Passed")
        except Exception as e:
            self.test_results.append(f"❌ {test_name}: Failed - {str(e)}")
            print(f"❌ {test_name}: Failed - {str(e)}")

    def test_debug_endpoint(self):
        response = requests.get(f"{self.base_url}/debug")
        if response.status_code != 200:
            raise Exception(f"Expected status code 200, got {response.status_code}")
        data = response.json()
        if "status" not in data or data["status"] != "ok":
            raise Exception("Invalid response format")

    def test_ai_endpoint(self):
        response = requests.get(f"{self.base_url}/ai")
        if response.status_code != 200:
            raise Exception(f"Expected status code 200, got {response.status_code}")
        data = response.json()
        if "status" not in data or data["status"] != "ok":
            raise Exception("Invalid response format")

    def test_llm_endpoint(self):
        payload = {"prompt": "Hello, how are you?"}
        response = requests.post(f"{self.base_url}/ai/call-llm", json=payload)
        if response.status_code != 200:
            raise Exception(f"Expected status code 200, got {response.status_code}")
        data = response.json()
        if "status" not in data or data["status"] != "success":
            raise Exception("Invalid response format")

    def test_transcribe_endpoint(self):
        # Get the path to sample.mp3 in the test directory
        audio_file_path = Path(__file__).parent / "sample.mp3"
        
        if not audio_file_path.exists():
            raise Exception("sample.mp3 not found in test directory")

        with open(audio_file_path, "rb") as audio_file:
            files = {"file": ("sample.mp3", audio_file, "audio/mpeg")}
            response = requests.post(f"{self.base_url}/ai/transcribe", files=files)

        if response.status_code != 200:
            raise Exception(f"Expected status code 200, got {response.status_code}")
        data = response.json()
        if "status" not in data or data["status"] != "success":
            raise Exception("Invalid response format")

    def test_set_initial_data_endpoint(self):
        # Get the path to sample.mp3 in the test directory
        audio_file_path = Path(__file__).parent / "sample.mp3"
        
        if not audio_file_path.exists():
            raise Exception("sample.mp3 not found in test directory")

        # Read the audio file as bytes and convert to base64
        with open(audio_file_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

        # Test for each role
        for role in ["teacher", "parent", "student"]:
            payload = {
                "role": role,
                "audio": audio_base64
            }
            response = requests.post(f"{self.base_url}/ai/set-initial-data", json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Expected status code 200, got {response.status_code}")
            
            data = response.json()
            if "status" not in data or data["status"] != "success":
                raise Exception("Invalid response format")
            
            if "role" not in data or data["role"] != role:
                raise Exception(f"Invalid role in response. Expected {role}")
            
            if "transcribed_text" not in data:
                raise Exception("Missing transcribed_text in response")

    def run_all_tests(self):
        print("\n🚀 Starting API Tests...\n")
        
        self.run_test("Debug Endpoint Test", self.test_debug_endpoint)
        self.run_test("AI Endpoint Test", self.test_ai_endpoint)
        self.run_test("LLM Endpoint Test", self.test_llm_endpoint)
        self.run_test("Transcribe Endpoint Test", self.test_transcribe_endpoint)
        self.run_test("Set Initial Data Endpoint Test", self.test_set_initial_data_endpoint)

        print("\n📊 Test Summary:")
        for result in self.test_results:
            print(result)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if "Passed" in result)
        print(f"\nTotal Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")

if __name__ == "__main__":
    # Make sure the API server is running before running tests
    tester = APITester()
    tester.run_all_tests() 