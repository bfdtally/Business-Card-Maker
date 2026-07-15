import type { LessonPlan } from "@/lib/types";

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="break-inside-avoid border-t border-[#d8ded8] pt-6 print:border-[#b8b8b8]">
      <h3 className="text-xl font-semibold text-[#244c5a] print:text-black">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#303833]">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#66736b]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#1d2320]">{value}</dd>
    </div>
  );
}

export default function LessonPlanPreview({ lessonPlan }: { lessonPlan: LessonPlan }) {
  return (
    <article className="space-y-8 rounded-md border border-[#d8ded8] bg-white p-6 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header>
        <h2 className="text-3xl font-bold text-[#1d2320] print:text-2xl">{lessonPlan.heading.title}</h2>
        <p className="mt-2 text-sm text-[#59635d]">{lessonPlan.heading.subtitle}</p>
      </header>

      <dl className="grid gap-4 rounded-md bg-[#f1f5f2] p-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2 print:border print:border-[#b8b8b8] print:bg-white">
        <Detail label="Name" value={lessonPlan.name} />
        <Detail label="Grade Level" value={lessonPlan.gradeLevel} />
        <Detail label="State" value={lessonPlan.state} />
        <Detail label="Title of Lesson" value={lessonPlan.titleOfLesson} />
        <Detail label="Subject" value={lessonPlan.subject} />
        <Detail label="Unit" value={lessonPlan.unit} />
        <Detail label="Lesson" value={lessonPlan.lesson} />
      </dl>

      <Section title="Goals" items={lessonPlan.goals} />
      <Section title="Behavioral Objectives" items={lessonPlan.specificBehavioralObjectives} />
      <Section title="Standards" items={lessonPlan.associatedStandards} />
      <Section title="Standards Sources" items={lessonPlan.standardsSources} />
      {lessonPlan.providedResources.length > 0 ? (
        <Section title="Provided Resources" items={lessonPlan.providedResources} />
      ) : null}
      <Section title="Materials" items={lessonPlan.materialsResourcesEquipment} />
      <Section title="Preventative Techniques" items={lessonPlan.preventativeTechniques} />
      <Section title="Interventive Techniques" items={lessonPlan.interventiveTechniques} />

      <section className="break-before-auto border-t border-[#d8ded8] pt-6 print:border-[#b8b8b8]">
        <h3 className="text-xl font-semibold text-[#244c5a] print:text-black">Step-by-step Procedures</h3>
        <div className="mt-4 grid gap-4">
          <Section title="1. Attention Grabber" items={lessonPlan.methodsProcedures.attentionGrabber} />
          <Section title="2. Introduction of the Lesson" items={lessonPlan.methodsProcedures.introductionOfLesson} />
          <Section title="3. Teacher Modeling / Direct Instruction" items={lessonPlan.methodsProcedures.teacherModelingDirectInstruction} />
          <Section title="4. Critical Thinking Questioning / Guided Practice" items={lessonPlan.methodsProcedures.criticalThinkingQuestioningGuidedPractice} />
          <Section title="5. Independent or Group Work" items={lessonPlan.methodsProcedures.independentOrGroupWork} />
        </div>
      </section>

      <Section title="Assessment" items={lessonPlan.assessment} />

      <section className="break-inside-avoid border-t border-[#d8ded8] pt-6 print:border-[#b8b8b8]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-xl font-semibold text-[#244c5a] print:text-black">Rubric</h3>
          <p className="text-sm font-semibold text-[#59635d]">
            Total possible points: {lessonPlan.rubric.totalPossiblePoints}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-[#f1f5f2]">
                <th className="border border-[#d8ded8] p-3 font-semibold">Criteria</th>
                <th className="border border-[#d8ded8] p-3 font-semibold">Excellent / Points</th>
                <th className="border border-[#d8ded8] p-3 font-semibold">Proficient / Points</th>
                <th className="border border-[#d8ded8] p-3 font-semibold">Developing / Points</th>
                <th className="border border-[#d8ded8] p-3 font-semibold">Beginning / Points</th>
              </tr>
            </thead>
            <tbody>
              {lessonPlan.rubric.criteria.map((criterion) => (
                <tr key={criterion.criterion}>
                  <th className="border border-[#d8ded8] p-3 align-top font-semibold">{criterion.criterion}</th>
                  {["Excellent", "Proficient", "Developing", "Beginning"].map((label) => {
                    const level = criterion.levels.find((item) => item.label === label);
                    return (
                      <td key={`${criterion.criterion}-${label}`} className="border border-[#d8ded8] p-3 align-top">
                        <span className="font-semibold">{level?.points ?? 0} pts</span>
                        <p className="mt-1 leading-6 text-[#303833]">{level?.description}</p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Section title="Reflection" items={lessonPlan.reflection} />
      <Section title="Enrichment Activities" items={lessonPlan.enrichmentActivities} />
    </article>
  );
}
