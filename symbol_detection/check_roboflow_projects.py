from roboflow import Roboflow
import argparse

def list_projects(api_key):
    try:
        rf = Roboflow(api_key=api_key)
        print(f"Workspace: {rf.workspace().url}")
        print("Projects:")
        for p in rf.workspace().projects():
            print(f" - {p} (ID: {p.split('/')[-1]})")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--api-key', type=str, required=True)
    args = parser.parse_args()
    list_projects(args.api_key)
