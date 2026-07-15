import type { LessonFormData, LessonPlan } from "./types";

export const emptyForm: LessonFormData = {
  name: "",
  subject: "",
  unit: "",
  lesson: "",
  gradeLevel: "",
  state: "",
  resources: "",
  lessonDescription: ""
};

export function fallbackLessonPlan(form: LessonFormData): LessonPlan {
  return {
    heading: {
      title: "Lesson Plan",
      subtitle: "Classroom-ready lesson plan and rubric"
    },
    name: form.name,
    gradeLevel: form.gradeLevel,
    state: form.state,
    titleOfLesson: form.lesson,
    subject: form.subject,
    unit: form.unit,
    lesson: form.lesson,
    goals: ["Students will build understanding of the lesson topic through an engaging, grade-appropriate learning experience."],
    specificBehavioralObjectives: [
      "Given teacher modeling, guided practice, and classroom materials, students will explain or demonstrate the key lesson concept with at least 80% accuracy."
    ],
    associatedStandards: [
      `Suggested ${form.state} standards alignment: Select grade-level standards that match the lesson topic and verify exact standard codes and wording with the official state education agency or district source.`
    ],
    standardsSources: [
      `Official ${form.state} education agency or standards website`
    ],
    providedResources: form.resources
      ? form.resources.split("\n").filter((resource) => resource.trim().length > 0)
      : [],
    materialsResourcesEquipment: [
      "Teacher presentation or anchor chart",
      "Student handouts or notebooks",
      "Pencils or classroom writing tools",
      "Low-cost manipulatives, paper, sticky notes, or index cards as needed"
    ],
    preventativeTechniques: [
      "Post clear directions and success criteria before students begin.",
      "Use proximity, predictable routines, and positive narration to reinforce expected behavior.",
      "Check for understanding before independent or group work begins."
    ],
    interventiveTechniques: [
      "Redirect off-task students quietly and specifically.",
      "Offer a clarifying question, visual cue, or short reteach for confused students.",
      "Use a brief reset or partner support when students need help re-entering the task."
    ],
    methodsProcedures: {
      attentionGrabber: ["Begin with a question, image, quick demonstration, or short scenario connected to students' experiences."],
      introductionOfLesson: ["State the learning goal, explain why the lesson matters, and connect it to prior learning."],
      teacherModelingDirectInstruction: ["Model the thinking process step by step while students observe and respond to brief checks for understanding."],
      criticalThinkingQuestioningGuidedPractice: ["Ask students to explain reasoning, compare examples, and try a guided practice item with feedback."],
      independentOrGroupWork: ["Students complete an individual, partner, or small-group task that applies the lesson concept."]
    },
    assessment: [
      "Use teacher observation, student responses, and a short exit ticket or product check to determine whether students met the objective."
    ],
    rubric: {
      totalPossiblePoints: 16,
      criteria: ["Understanding", "Application", "Participation", "Communication"].map((criterion) => ({
        criterion,
        levels: [
          { label: "Excellent", points: 4, description: "Shows strong understanding and completes the task with clear, accurate details." },
          { label: "Proficient", points: 3, description: "Shows solid understanding and completes most of the task accurately." },
          { label: "Developing", points: 2, description: "Shows partial understanding and needs some support or more complete details." },
          { label: "Beginning", points: 1, description: "Shows limited understanding and needs significant support to complete the task." }
        ]
      }))
    },
    reflection: [
      "What evidence showed that students met or did not meet the objective?",
      "Which part of the lesson was most effective, and why?",
      "What would you adjust before teaching this lesson again?"
    ],
    enrichmentActivities: [
      "Have students create a visual, digital, or written product that teaches the concept to another student.",
      "Offer a challenge task that asks students to apply the concept to a new real-world example."
    ]
  };
}
