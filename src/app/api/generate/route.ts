import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requiredFields, type LessonFormData, type LessonPlan } from "@/lib/types";

const lessonPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "heading",
    "name",
    "gradeLevel",
    "state",
    "titleOfLesson",
    "subject",
    "unit",
    "lesson",
    "goals",
    "specificBehavioralObjectives",
    "associatedStandards",
    "standardsSources",
    "providedResources",
    "materialsResourcesEquipment",
    "preventativeTechniques",
    "interventiveTechniques",
    "methodsProcedures",
    "assessment",
    "rubric",
    "reflection",
    "enrichmentActivities"
  ],
  properties: {
    heading: {
      type: "object",
      additionalProperties: false,
      required: ["title", "subtitle"],
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" }
      }
    },
    name: { type: "string" },
    gradeLevel: { type: "string" },
    state: { type: "string" },
    titleOfLesson: { type: "string" },
    subject: { type: "string" },
    unit: { type: "string" },
    lesson: { type: "string" },
    goals: { type: "array", items: { type: "string" } },
    specificBehavioralObjectives: { type: "array", items: { type: "string" } },
    associatedStandards: { type: "array", items: { type: "string" } },
    standardsSources: { type: "array", items: { type: "string" } },
    providedResources: { type: "array", items: { type: "string" } },
    materialsResourcesEquipment: { type: "array", items: { type: "string" } },
    preventativeTechniques: { type: "array", items: { type: "string" } },
    interventiveTechniques: { type: "array", items: { type: "string" } },
    methodsProcedures: {
      type: "object",
      additionalProperties: false,
      required: [
        "attentionGrabber",
        "introductionOfLesson",
        "teacherModelingDirectInstruction",
        "criticalThinkingQuestioningGuidedPractice",
        "independentOrGroupWork"
      ],
      properties: {
        attentionGrabber: { type: "array", items: { type: "string" } },
        introductionOfLesson: { type: "array", items: { type: "string" } },
        teacherModelingDirectInstruction: { type: "array", items: { type: "string" } },
        criticalThinkingQuestioningGuidedPractice: { type: "array", items: { type: "string" } },
        independentOrGroupWork: { type: "array", items: { type: "string" } }
      }
    },
    assessment: { type: "array", items: { type: "string" } },
    rubric: {
      type: "object",
      additionalProperties: false,
      required: ["criteria", "totalPossiblePoints"],
      properties: {
        totalPossiblePoints: { type: "number" },
        criteria: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["criterion", "levels"],
            properties: {
              criterion: { type: "string" },
              levels: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["label", "points", "description"],
                  properties: {
                    label: { type: "string", enum: ["Excellent", "Proficient", "Developing", "Beginning"] },
                    points: { type: "number" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    reflection: { type: "array", items: { type: "string" } },
    enrichmentActivities: { type: "array", items: { type: "string" } }
  }
} as const;

function validateForm(form: LessonFormData) {
  return requiredFields.filter((field) => !form[field]?.trim());
}

const rubricLabels = ["Excellent", "Proficient", "Developing", "Beginning"] as const;

function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function hasAllRequiredSections(lessonPlan: LessonPlan) {
  const procedures = lessonPlan.methodsProcedures;
  return Boolean(
    lessonPlan.heading?.title &&
      lessonPlan.heading?.subtitle &&
      lessonPlan.name &&
      lessonPlan.gradeLevel &&
      lessonPlan.state &&
      lessonPlan.titleOfLesson &&
      lessonPlan.subject &&
      lessonPlan.unit &&
      lessonPlan.lesson &&
      textArray(lessonPlan.goals).length &&
      textArray(lessonPlan.specificBehavioralObjectives).length &&
      textArray(lessonPlan.associatedStandards).length &&
      textArray(lessonPlan.standardsSources).length &&
      textArray(lessonPlan.materialsResourcesEquipment).length &&
      textArray(lessonPlan.preventativeTechniques).length &&
      textArray(lessonPlan.interventiveTechniques).length &&
      procedures &&
      textArray(procedures.attentionGrabber).length &&
      textArray(procedures.introductionOfLesson).length &&
      textArray(procedures.teacherModelingDirectInstruction).length &&
      textArray(procedures.criticalThinkingQuestioningGuidedPractice).length &&
      textArray(procedures.independentOrGroupWork).length &&
      textArray(lessonPlan.assessment).length &&
      textArray(lessonPlan.reflection).length &&
      textArray(lessonPlan.enrichmentActivities).length >= 2
  );
}

function hasCompleteRubric(lessonPlan: LessonPlan) {
  return Boolean(
    lessonPlan.rubric &&
      Number.isFinite(lessonPlan.rubric.totalPossiblePoints) &&
      Array.isArray(lessonPlan.rubric.criteria) &&
      lessonPlan.rubric.criteria.length === 4 &&
      lessonPlan.rubric.criteria.every(
        (criterion) =>
          typeof criterion.criterion === "string" &&
          criterion.criterion.trim().length > 0 &&
          Array.isArray(criterion.levels) &&
          rubricLabels.every((label) =>
            criterion.levels.some(
              (level) =>
                level.label === label &&
                Number.isFinite(level.points) &&
                typeof level.description === "string" &&
                level.description.trim().length > 0
            )
          )
      )
  );
}

function assertCompleteLessonPlan(lessonPlan: LessonPlan) {
  if (!hasAllRequiredSections(lessonPlan) || !hasCompleteRubric(lessonPlan)) {
    throw new Error("Generated lesson plan did not include every required section.");
  }
}

async function findStandardsContext(openai: OpenAI, form: LessonFormData) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content:
          "Find official K-12 academic standards sources. Prefer official state education agency pages, official standards portals, and official state-backed standards databases such as CPALMS for Florida. Be concise."
      },
      {
        role: "user",
        content: `Find the most relevant official standards sources and likely standards for this lesson.

State: ${form.state}
Grade Level: ${form.gradeLevel}
Subject: ${form.subject}
Unit: ${form.unit}
Lesson: ${form.lesson}
Lesson Description: ${form.lessonDescription}

Return concise notes with:
- likely official standards framework/source name for this state and subject
- 2 to 6 likely relevant standards, benchmarks, or standard-code candidates
- source URLs or official source names
- uncertainty notes if exact wording or codes need verification`
      }
    ]
  });

  return response.output_text;
}

export async function POST(request: Request) {
  const form = (await request.json()) as LessonFormData;
  const missingFields = validateForm(form);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: "Please complete all required fields.", missingFields },
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "Something went wrong. Please check your information and try again."
      },
      { status: 500 }
    );
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    let standardsContext = "";
    try {
      standardsContext = await findStandardsContext(openai, form);
    } catch (lookupError) {
      console.error("Standards lookup failed:", lookupError);
      standardsContext =
        `Live standards lookup was unavailable. Generate suggested ${form.state} standards alignments from model knowledge and clearly tell the user to verify exact codes and wording with the official state education agency or district standards source.`;
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You create complete, practical, classroom-appropriate lesson plans for teachers, parents, tutors, homeschool educators, and education students. Return only valid structured JSON that matches the provided schema. Never return markdown or prose outside the JSON. Keep language clear, specific, teacher-friendly, and ready to use in a real classroom."
        },
        {
          role: "user",
          content: `Create a complete lesson plan using this required format:

Lesson Plan
Classroom-ready lesson plan and rubric

Name: ${form.name}
Grade Level: ${form.gradeLevel}
State for K-12 Content Standards: ${form.state}
Title of Lesson: ${form.lesson}
Subject: ${form.subject}
Unit: ${form.unit}
Lesson: ${form.lesson}

Lesson Description:
${form.lessonDescription}

Teacher-provided resources, URLs, uploaded file names, and excerpts:
${form.resources?.trim() || "No additional resources were provided."}

Live standards lookup notes:
${standardsContext}

Requirements:
- Always include Goals.
- Always include Behavioral Objectives with measurable action verbs.
- Always identify the likely official K-12 content standards framework for ${form.state} and this subject area. For example, Florida science and social studies standards may be found through CPALMS, while Florida math and ELA use B.E.S.T. Standards.
- Always include Standards aligned to ${form.state}, the grade level, subject, unit, and lesson.
- Use the live standards lookup notes above to select the most relevant standards.
- Include the most relevant standard codes, strands, benchmarks, or concise descriptions when the lookup supports them.
- Always include standardsSources with official source names and URLs when available.
- If exact standard codes, source names, or wording may be uncertain, clearly label them as suggested alignments and tell the user to verify the exact standards with the official ${form.state} education agency, district, or standards website.
- Always include Materials, including low-cost classroom materials when possible.
- If teacher-provided resources are included, use them to enrich the lesson where relevant.
- Always include providedResources as a concise list of resources, URLs, uploaded file names, or excerpts the lesson used. Use an empty array if none were provided.
- Do not invent resource URLs. Only include URLs that were provided by the user or found in the live standards lookup notes.
- Always include Preventative Techniques.
- Always include Interventive Techniques.
- Always include Step-by-step Procedures with Attention Grabber, Introduction of the Lesson, Teacher Modeling / Direct Instruction, Critical Thinking Questioning / Guided Practice, and Independent or Group Work.
- Always include Assessment.
- Always include Reflection prompts.
- Always include at least two Enrichment Activities.
- Always include a rubric with exactly 4 criteria.
- Each rubric criterion must include Excellent, Proficient, Developing, and Beginning.
- Each rubric performance level must include points and a clear learner-friendly description.
- Include total possible points for the rubric.`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lesson_plan",
          schema: lessonPlanSchema,
          strict: true
        }
      }
    });

    const lessonPlan = JSON.parse(response.output_text) as LessonPlan;
    assertCompleteLessonPlan(lessonPlan);

    return NextResponse.json({ lessonPlan });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Something went wrong. Please check your information and try again."
      },
      { status: 500 }
    );
  }
}
