from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
import os

@CrewBase
class EventCrew():
    agents: List[BaseAgent]
    tasks: List[Task]

    @property
    def llm(self):
        os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY", "")

        return LLM(
            model="gemini/gemini-2.5-flash",
            api_key=os.environ.get("GEMINI_API_KEY", ""),
            temperature=0.2
        )

    @agent
    def event_scheduler(self) -> Agent:
        return Agent(config=self.agents_config["event_scheduler"], llm=self.llm, verbose=True)

    @agent
    def venue_manager(self) -> Agent:
        return Agent(config=self.agents_config["venue_manager"], llm=self.llm, verbose=True)

    @agent
    def volunteer_assigner(self) -> Agent:
        return Agent(config=self.agents_config["volunteer_assigner"], llm=self.llm, verbose=True)

    @agent
    def conflict_resolver(self) -> Agent:
        return Agent(config=self.agents_config["conflict_resolver"], llm=self.llm, verbose=True)

    @agent
    def adaptive_replanner(self) -> Agent:
        return Agent(config=self.agents_config["adaptive_replanner"], llm=self.llm, verbose=True)

    @agent
    def decision_explainer(self) -> Agent:
        return Agent(config=self.agents_config["decision_explainer"], llm=self.llm, verbose=True)

    @task
    def schedule_events(self) -> Task:
        return Task(config=self.tasks_config["schedule_events"])

    @task
    def allocate_venues(self) -> Task:
        return Task(config=self.tasks_config["allocate_venues"])

    @task
    def assign_volunteers(self) -> Task:
        return Task(config=self.tasks_config["assign_volunteers"])

    @task
    def resolve_conflicts(self) -> Task:
        return Task(config=self.tasks_config["resolve_conflicts"])

    @task
    def adaptive_replanning(self) -> Task:
        return Task(config=self.tasks_config["adaptive_replanning"])

    @task
    def explain_decisions(self) -> Task:
        return Task(config=self.tasks_config["explain_decisions"])

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True
        )
