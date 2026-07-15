"use client";

import dynamic from "next/dynamic";
import { FormEvent, useMemo, useState } from "react";
import LessonPlanPreview from "@/components/LessonPlanPreview";
import { emptyForm } from "@/lib/lessonPlan";
import { requiredFields, type LessonFormData, type LessonPlan } from "@/lib/types";

const LessonPlanPdfDownload = dynamic(() => import("@/components/LessonPlanPdf"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex min-h-11 items-center rounded-md bg-[#e5ebe6] px-5 py-3 text-sm font-semibold text-[#244c5a]">
      Loading PDF...
    </span>
  )
});

const fieldLabels: Record<keyof LessonFormData, string> = {
  name: "Name",
  subject: "Subject",
  unit: "Unit",
  lesson: "Lesson",
  gradeLevel: "Grade Level",
  state: "State for K-12 Content Standards",
  resources: "Resources",
  lessonDescription: "Lesson Description"
};

const placeholders: Record<keyof LessonFormData, string> = {
  name: "Example: Jordan Rivera",
  subject: "Example: Science",
  unit: "Example: Weather and Climate",
  lesson: "Example: Reading Weather Maps",
  gradeLevel: "Example: Grade 4",
  state: "Example: Florida",
  resources: "Paste helpful URLs, video links, textbook references, article links, or notes you want the lesson to use.",
  lessonDescription:
    "Describe what students should learn, the activity you have in mind, and the kind of learning experience you want to create."
};

function InputField({
  field,
  value,
  error,
  onChange
}: {
  field: keyof LessonFormData;
  value: string;
  error?: string;
  onChange: (field: keyof LessonFormData, value: string) => void;
}) {
  const id = `field-${field}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-[#28312c]">
        {fieldLabels[field]} <span className="text-[#9d3b32]">*</span>
      </label>
      <input
        id={id}
        name={field}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholders[field]}
        list={field === "state" ? "state-options" : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 min-h-11 w-full rounded-md border border-[#cbd5cd] bg-white px-3 py-2 text-sm text-[#1d2320] outline-none transition placeholder:text-[#8a968e] focus:border-[#244c5a] focus:ring-2 focus:ring-[#244c5a]/20"
      />
      {field === "state" ? (
        <datalist id="state-options">
          <option value="Alabama" />
          <option value="Alaska" />
          <option value="Arizona" />
          <option value="Arkansas" />
          <option value="California" />
          <option value="Colorado" />
          <option value="Connecticut" />
          <option value="Delaware" />
          <option value="District of Columbia" />
          <option value="Florida" />
          <option value="Georgia" />
          <option value="Hawaii" />
          <option value="Idaho" />
          <option value="Illinois" />
          <option value="Indiana" />
          <option value="Iowa" />
          <option value="Kansas" />
          <option value="Kentucky" />
          <option value="Louisiana" />
          <option value="Maine" />
          <option value="Maryland" />
          <option value="Massachusetts" />
          <option value="Michigan" />
          <option value="Minnesota" />
          <option value="Mississippi" />
          <option value="Missouri" />
          <option value="Montana" />
          <option value="Nebraska" />
          <option value="Nevada" />
          <option value="New Hampshire" />
          <option value="New Jersey" />
          <option value="New Mexico" />
          <option value="New York" />
          <option value="North Carolina" />
          <option value="North Dakota" />
          <option value="Ohio" />
          <option value="Oklahoma" />
          <option value="Oregon" />
          <option value="Pennsylvania" />
          <option value="Rhode Island" />
          <option value="South Carolina" />
          <option value="South Dakota" />
          <option value="Tennessee" />
          <option value="Texas" />
          <option value="Utah" />
          <option value="Vermont" />
          <option value="Virginia" />
          <option value="Washington" />
          <option value="West Virginia" />
          <option value="Wisconsin" />
          <option value="Wyoming" />
        </datalist>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-[#9d3b32]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState<LessonFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof LessonFormData, string>>>({});
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const hasResult = Boolean(lessonPlan);
  const completedCount = useMemo(
    () => requiredFields.filter((field) => form[field].trim()).length,
    [form]
  );

  function updateField(field: keyof LessonFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function clearForm() {
    setForm(emptyForm);
    setErrors({});
    setLessonPlan(null);
    setNotice(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof LessonFormData, string>> = {};
    for (const field of requiredFields) {
      if (!form[field].trim()) {
        nextErrors[field] = `${fieldLabels[field]} is required.`;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleResourceFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const summaries = await Promise.all(
      Array.from(files).map(async (file) => {
        const header = `Uploaded file: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        const canReadText =
          file.type.startsWith("text/") ||
          /\.(txt|md|csv|json|html|rtf)$/i.test(file.name);

        if (!canReadText) {
          return `${header}\nNote: File content was not extracted in the browser. Paste key excerpts or links above if you want the AI to use specific details from this file.`;
        }

        const text = await file.text();
        const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 3000);
        return `${header}\nExcerpt: ${excerpt}`;
      })
    );

    setForm((current) => ({
      ...current,
      resources: [current.resources, ...summaries].filter(Boolean).join("\n\n")
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!validate()) {
      setNotice("Please complete every required field before generating.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Something went wrong. Please check your information and try again.");
      }

      setLessonPlan(data.lessonPlan);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong. Please check your information and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] print:bg-white">
      <section className="border-b border-[#d8ded8] bg-[#edf3ef] print:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="mt-2 text-3xl font-bold text-[#1d2320] sm:text-4xl">
              Lesson Plan Generator
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#4d5952]">
              Create a complete classroom-ready lesson plan from your lesson idea, grade level, and chosen standards framework.
            </p>
          </div>
          <div className="rounded-md border border-[#cbd5cd] bg-white px-4 py-3 text-sm font-semibold text-[#244c5a] shadow-sm">
            {completedCount} of {requiredFields.length} required fields complete
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(320px,440px)_1fr] lg:items-start print:block print:max-w-none print:p-0">
        <form id="lesson-form" onSubmit={handleSubmit} className="space-y-5 rounded-md border border-[#d8ded8] bg-white p-5 shadow-sm sm:p-6 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-[#1d2320]">Lesson details</h2>
            <p className="mt-2 text-sm leading-6 text-[#59635d]">
              Fill in each required field, including the state whose standards you want used, then generate a lesson plan preview you can download as a PDF.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <InputField field="name" value={form.name} error={errors.name} onChange={updateField} />
            <InputField field="subject" value={form.subject} error={errors.subject} onChange={updateField} />
            <InputField field="unit" value={form.unit} error={errors.unit} onChange={updateField} />
            <InputField field="lesson" value={form.lesson} error={errors.lesson} onChange={updateField} />
            <InputField field="gradeLevel" value={form.gradeLevel} error={errors.gradeLevel} onChange={updateField} />
            <InputField field="state" value={form.state} error={errors.state} onChange={updateField} />
          </div>

          <div>
            <label htmlFor="field-lessonDescription" className="text-sm font-semibold text-[#28312c]">
              Lesson Description / What do you want to do in this lesson? <span className="text-[#9d3b32]">*</span>
            </label>
            <textarea
              id="field-lessonDescription"
              name="lessonDescription"
              value={form.lessonDescription}
              onChange={(event) => updateField("lessonDescription", event.target.value)}
              placeholder={placeholders.lessonDescription}
              rows={8}
              aria-invalid={Boolean(errors.lessonDescription)}
              aria-describedby={errors.lessonDescription ? "field-lessonDescription-error" : undefined}
              className="mt-2 w-full resize-y rounded-md border border-[#cbd5cd] bg-white px-3 py-3 text-sm leading-6 text-[#1d2320] outline-none transition placeholder:text-[#8a968e] focus:border-[#244c5a] focus:ring-2 focus:ring-[#244c5a]/20"
            />
            {errors.lessonDescription ? (
              <p id="field-lessonDescription-error" className="mt-2 text-sm text-[#9d3b32]">
                {errors.lessonDescription}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="field-resources" className="text-sm font-semibold text-[#28312c]">
              Resources / URLs to include <span className="text-[#66736b]">(optional)</span>
            </label>
            <textarea
              id="field-resources"
              name="resources"
              value={form.resources}
              onChange={(event) => updateField("resources", event.target.value)}
              placeholder={placeholders.resources}
              rows={5}
              className="mt-2 w-full resize-y rounded-md border border-[#cbd5cd] bg-white px-3 py-3 text-sm leading-6 text-[#1d2320] outline-none transition placeholder:text-[#8a968e] focus:border-[#244c5a] focus:ring-2 focus:ring-[#244c5a]/20"
            />
            <input
              id="field-resourceFiles"
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.html,.rtf,.pdf,.doc,.docx"
              onChange={(event) => handleResourceFiles(event.target.files)}
              className="mt-3 block w-full text-sm text-[#59635d] file:mr-3 file:rounded-md file:border file:border-[#b9c4bc] file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#244c5a]"
            />
            <p className="mt-2 text-xs leading-5 text-[#66736b]">
              URLs and pasted notes are sent to the generator. Text files are excerpted automatically; PDF and Word files are listed by name unless you paste key excerpts.
            </p>
          </div>

          {notice ? (
            <div className="rounded-md border border-[#e1b9a8] bg-[#fff7f2] p-3 text-sm leading-6 text-[#7b3928]">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button
              type="submit"
              disabled={isGenerating}
              className="flex min-h-12 w-full items-center justify-center rounded-md bg-[#244c5a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#183942] focus:outline-none focus:ring-2 focus:ring-[#244c5a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#879894]"
            >
              {isGenerating
                ? "Generating your lesson plan and rubric..."
                : hasResult
                  ? "Regenerate Lesson Plan"
                  : "Generate Lesson Plan"}
            </button>
            <button
              type="button"
              onClick={clearForm}
              disabled={isGenerating}
              className="flex min-h-12 w-full items-center justify-center rounded-md border border-[#b9c4bc] bg-white px-5 py-3 text-sm font-semibold text-[#244c5a] shadow-sm transition hover:bg-[#f1f5f2] focus:outline-none focus:ring-2 focus:ring-[#244c5a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#879894]"
            >
              Clear Form
            </button>
          </div>
        </form>

        <section className="min-w-0 print:min-w-full">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="text-xl font-bold text-[#1d2320]">Preview</h2>
            {hasResult && lessonPlan ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  form="lesson-form"
                  disabled={isGenerating}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#b9c4bc] bg-white px-5 py-3 text-sm font-semibold text-[#244c5a] shadow-sm transition hover:bg-[#f1f5f2] focus:outline-none focus:ring-2 focus:ring-[#244c5a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#879894]"
                >
                  Regenerate Lesson Plan
                </button>
                <LessonPlanPdfDownload lessonPlan={lessonPlan} />
              </div>
            ) : null}
          </div>

          {isGenerating ? (
            <div className="mb-4 rounded-md border border-[#cbd5cd] bg-white p-4 text-sm font-semibold text-[#244c5a] shadow-sm print:hidden">
              Generating your lesson plan and rubric...
            </div>
          ) : null}

          {lessonPlan ? (
            <LessonPlanPreview lessonPlan={lessonPlan} />
          ) : (
            <div className="flex min-h-[520px] items-center justify-center rounded-md border border-dashed border-[#b9c4bc] bg-white p-8 text-center">
              <div className="max-w-md">
                <h3 className="text-lg font-semibold text-[#244c5a]">Your generated lesson plan will appear here.</h3>
                <p className="mt-3 text-sm leading-6 text-[#59635d]">
                  Complete the form and generate a plan to review the full template, rubric, reflection prompts, and enrichment activities.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
