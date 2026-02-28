```json
{
  "scheduled_events": [
    {
      "program_id": "0ade9e9e-5573-44a3-a8d6-fbab2b851d19",
      "name": "hackathon",
      "id": "377695a2-7445-4607-9757-dc178fb3c137",
      "start_time": "2026-02-26T00:00:00",
      "end_time": "2026-02-27T00:00:00",
      "duration": 1440,
      "expectedParticipants": 100,
      "priority": 1,
      "domain": "tech",
      "preferredVenueId": "389409ad-163c-4aee-8f27-0a4aeae44588"
    },
    {
      "program_id": "0ade9e9e-5573-44a3-a8d6-fbab2b851d19",
      "name": "code clash",
      "id": "697c9a96-3976-41c1-b5cf-d878ebf4f2f7",
      "start_time": "2026-02-27T09:00:00",
      "end_time": "2026-02-27T12:00:00",
      "duration": 180,
      "expectedParticipants": 20,
      "priority": 1,
      "domain": "Tech",
      "preferredVenueId": "389409ad-163c-4aee-8f27-0a4aeae44588"
    },
    {
      "program_id": "0ade9e9e-5573-44a3-a8d6-fbab2b851d19",
      "name": "basketball",
      "id": "92dd57e0-2980-4d7d-b18e-563a79d9db0b",
      "start_time": "2026-02-27T12:00:00",
      "end_time": "2026-02-27T13:00:00",
      "duration": 60,
      "expectedParticipants": 50,
      "priority": 1,
      "domain": "sports",
      "preferredVenueId": "e8c050ed-69ed-4086-a67d-466e2fe312b7"
    }
  ],
  "unscheduled_events": [],
  "event_venue_assignments": [
    {
      "event_id": "377695a2-7445-4607-9757-dc178fb3c137",
      "venue_id": "389409ad-163c-4aee-8f27-0a4aeae44588"
    },
    {
      "event_id": "697c9a96-3976-41c1-b5cf-d878ebf4f2f7",
      "venue_id": "389409ad-163c-4aee-8f27-0a4aeae44588"
    },
    {
      "event_id": "92dd57e0-2980-4d7d-b18e-563a79d9db0b",
      "venue_id": "e8c050ed-69ed-4086-a67d-466e2fe312b7"
    }
  ],
  "event_volunteer_assignments": [
    {
      "event_id": "377695a2-7445-4607-9757-dc178fb3c137",
      "assigned_volunteers": [
        {
          "volunteer_id": "2e0a5130-0108-45fb-9c81-635a9572ca00",
          "name": "test5",
          "skills_matched": ["General Support"]
        },
        {
          "volunteer_id": "75cc777a-68b3-4942-8e58-b01307437d43",
          "name": "test6",
          "skills_matched": ["General Support", "Registration"]
        }
      ]
    },
    {
      "event_id": "697c9a96-3976-41c1-b5cf-d878ebf4f2f7",
      "assigned_volunteers": [
        {
          "volunteer_id": "95911f65-bc12-496c-b650-df8328cb0e8e",
          "name": "test2",
          "skills_matched": ["General Support"]
        }
      ]
    },
    {
      "event_id": "92dd57e0-2980-4d7d-b18e-563a79d9db0b",
      "assigned_volunteers": [
        {
          "volunteer_id": "a24ad9a7-a38a-4af6-bdfd-3acfe1a2a2a8",
          "name": "test4",
          "skills_matched": ["General Support"]
        }
      ]
    }
  ]
}
```