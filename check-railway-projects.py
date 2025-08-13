#!/usr/bin/env python3
import requests
import json

TOKEN = "62ad2bd3-23f8-4162-b582-b530a211b93a"
API_URL = "https://api.railway.app/graphql/v2"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Get user info and teams
print("Fetching user info...")
user_query = {
    "query": """
    {
        me {
            id
            email
            teams {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    }
    """
}

response = requests.post(API_URL, headers=headers, json=user_query)
user_data = response.json()
print(f"User: {user_data['data']['me']['email']}")
print("Teams:")
for edge in user_data['data']['me']['teams']['edges']:
    team = edge['node']
    print(f"  - {team['name']} (ID: {team['id']})")

# Now let's try to get projects with team context
if user_data['data']['me']['teams']['edges']:
    team_id = user_data['data']['me']['teams']['edges'][0]['node']['id']
    print(f"\nUsing team ID: {team_id}")
    
    # Create project with team
    create_query = {
        "query": f"""
        mutation {{
            projectCreate(input: {{name: "padelyzer-final", teamId: "{team_id}"}}) {{
                project {{
                    id
                    name
                }}
            }}
        }}
        """
    }
    
    response = requests.post(API_URL, headers=headers, json=create_query)
    result = response.json()
    
    if 'errors' in result:
        print("Error:", result['errors'])
    else:
        project = result['data']['projectCreate']['project']
        print(f"\n✅ Project created!")
        print(f"Name: {project['name']}")
        print(f"ID: {project['id']}")
        print(f"URL: https://railway.app/project/{project['id']}")