"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dices, Lock } from "lucide-react";
import { PromptInput } from "@/components/create/prompt-input";
import { ModelSelector } from "@/components/create/model-selector";
import { AspectRatioSelector } from "@/components/create/aspect-ratio-selector";
import { GenerationButton } from "@/components/create/generation-button";
import { GenerationStage } from "@/components/create/generation-stage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useGenerationRunner } from "@/lib/hooks/use-generation-runner";
import { useAppConfig } from "@/lib/config-context";
import { useCreateStudio } from "@/lib/store/create-store";

const formSchema = z.object({
  prompt: z.string().trim().min(1, "Please describe what you want to create.").max(2000),
  negativePrompt: z.string().max(1000).optional(),
  aspectRatio: z.string(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  numImages: z.number().int().min(1).max(4),
  steps: z.number().int().min(1).max(100),
  guidanceScale: z.number().min(1).max(20),
  seed: z.string(),
  model: z.string(),
  quality: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = {
  prompt: "",
  negativePrompt: "",
  aspectRatio: "1:1",
  width: undefined,
  height: undefined,
  numImages: 1,
  steps: 28,
  guidanceScale: 7.5,
  seed: "",
  model: "auto",
  quality: "standard",
};

export function ImageGenerator() {
  const config = useAppConfig();
  const prefill = useCreateStudio((s) => s.prefill);
  const clearPrefill = useCreateStudio((s) => s.clearPrefill);
  const runner = useGenerationRunner();
  const [useCustomSize, setUseCustomSize] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Apply one-shot prefill (from "Use this prompt" / "Edit").
  React.useEffect(() => {
    if (prefill && !prefill.applied) {
      if (prefill.prompt) form.setValue("prompt", prefill.prompt);
      if (prefill.negativePrompt) form.setValue("negativePrompt", prefill.negativePrompt);
      if (prefill.model) form.setValue("model", prefill.model);
      if (prefill.aspectRatio) form.setValue("aspectRatio", prefill.aspectRatio);
      clearPrefill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const onSubmit = form.handleSubmit(async (values) => {
    const body = {
      prompt: values.prompt,
      negativePrompt: values.negativePrompt || undefined,
      aspectRatio: useCustomSize ? undefined : values.aspectRatio,
      width: useCustomSize ? values.width : undefined,
      height: useCustomSize ? values.height : undefined,
      numImages: values.numImages,
      steps: values.steps,
      guidanceScale: values.guidanceScale,
      seed: values.seed ? Number(values.seed) : undefined,
      model: values.model,
      quality: values.quality,
    };
    await runner.submit("/api/generate/image", body);
  });

    const values = useWatch({ control: form.control });

  const onRetry = () => runner.regenerate(runner.generation, false);

  const errors = form.formState.errors;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <Card>
          <CardContent className="space-y-5 pt-6">
            <PromptInput
              id="image-prompt"
              label="Prompt"
              placeholder="Describe what you want to create..."
              value={values.prompt ?? ""}
              onChange={(v) => form.setValue("prompt", v, { shouldValidate: true })}
              disabled={runner.submitting}
              autoFocus
            />
            {errors.prompt ? (
              <p className="text-sm text-red-400" role="alert">
                {errors.prompt.message}
              </p>
            ) : null}

            <PromptInput
              id="image-negative"
              label="Negative prompt"
              placeholder="What should be avoided?"
              value={values.negativePrompt ?? ""}
              onChange={(v) => form.setValue("negativePrompt", v)}
              maxLength={1000}
              disabled={runner.submitting}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ModelSelector
                id="image-model"
                value={values.model ?? "auto"}
                onChange={(v) => form.setValue("model", v)}
                models={config.options.imageModels}
              />
              <div className="space-y-1.5">
                <Label htmlFor="image-quality">Quality</Label>
                <Select
                  value={values.quality ?? "standard"}
                  onValueChange={(v) => form.setValue("quality", v)}
                >
                  <SelectTrigger id="image-quality" aria-label="Quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (fast)</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High (slow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AspectRatioSelector
              value={values.aspectRatio ?? "1:1"}
              onChange={(v) => form.setValue("aspectRatio", v)}
              options={config.options.imageAspectRatios}
            />

            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <input
                type="checkbox"
                id="custom-size"
                className="focus-ring size-4 rounded border-white/20 bg-white/10 accent-violet-500"
                checked={useCustomSize}
                onChange={(e) => setUseCustomSize(e.target.checked)}
              />
              <Label htmlFor="custom-size" className="cursor-pointer font-normal">
                Custom width &amp; height
              </Label>
            </div>

            {useCustomSize ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="image-width">Width</Label>
                  <Input
                    id="image-width"
                    type="number"
                    min={256}
                    max={2048}
                    step={8}
                    placeholder="1024"
                    {...form.register("width", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="image-height">Height</Label>
                  <Input
                    id="image-height"
                    type="number"
                    min={256}
                    max={2048}
                    step={8}
                    placeholder="1024"
                    {...form.register("height", { valueAsNumber: true })}
                  />
                </div>
                {(errors.width || errors.height) ? (
                  <p className="col-span-2 text-sm text-red-400" role="alert">
                    {errors.width?.message ?? errors.height?.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="image-steps">Steps</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {values.steps ?? 28}
                  </span>
                </div>
                <Slider
                  id="image-steps"
                  min={1}
                  max={100}
                  step={1}
                  value={[values.steps ?? 28]}
                  onValueChange={([v]) => form.setValue("steps", v)}
                  aria-label="Steps"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="image-cfg">Guidance scale</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {(values.guidanceScale ?? 7.5).toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="image-cfg"
                  min={1}
                  max={20}
                  step={0.5}
                  value={[values.guidanceScale ?? 7.5]}
                  onValueChange={([v]) => form.setValue("guidanceScale", v)}
                  aria-label="Guidance scale"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="image-count">Number of images</Label>
                <Input
                  id="image-count"
                  type="number"
                  min={1}
                  max={4}
                  {...form.register("numImages", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="image-seed" className="flex items-center gap-1.5">
                  Seed
                  <Dices className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </Label>
                <Input
                  id="image-seed"
                  type="number"
                  min={0}
                  placeholder="Random"
                  {...form.register("seed")}
                />
              </div>
            </div>

            <GenerationButton
              loading={runner.submitting}
              label="Generate Image"
              loadingLabel="Starting generation…"
            />

            {runner.generation?.isDemo || config.ai.image.mode === "demo" ? (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {runner.generation?.isDemo
                  ? "Demo preview: no AI model ran for this result."
                  : "Demo mode is active — results will be labelled previews until you connect a real AI provider."}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </form>

      <div>
        <GenerationStage
          generation={runner.generation}
          loading={runner.loading}
          cancelling={runner.cancelling}
          regenerating={runner.regenerating}
          onCancel={runner.cancel}
          onRegenerate={(variation) => void runner.regenerate(runner.generation, variation)}
          onRetry={() => void onRetry()}
          onDeleted={runner.reset}
        />
      </div>
    </div>
  );
}
