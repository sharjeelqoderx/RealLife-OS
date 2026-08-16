"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface WizardProgressFooterProps {
  currentStep: number
  totalSteps: number
  onPrevious?: () => void
  onNext?: () => void
  onFinish?: () => void
  nextLabel?: string
  previousLabel?: string
  finishLabel?: string
  nextDisabled?: boolean
  previousDisabled?: boolean
  className?: string
}

export function WizardProgressFooter({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onFinish,
  nextLabel = "Next",
  previousLabel = "Previous",
  finishLabel = "Finish",
  nextDisabled = false,
  previousDisabled = false,
  className,
}: WizardProgressFooterProps) {
  const progressValue = (currentStep / totalSteps) * 100
  const isFirst = currentStep <= 1
  const isLast = currentStep >= totalSteps

  return (
    <div className={cn("mt-10 space-y-4 border-t border-border pt-6", className)}>
      <Progress value={progressValue} className="h-2 bg-brand-primary/10" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-brand-text-muted">
          Step {currentStep} of {totalSteps}
        </p>
        <div className="flex items-center gap-2">
          {!isFirst && onPrevious ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={previousDisabled}
              onClick={onPrevious}
            >
              {previousLabel}
            </Button>
          ) : null}
          {isLast && onFinish ? (
            <Button type="button" size="lg" onClick={onFinish}>
              {finishLabel}
            </Button>
          ) : onNext ? (
            <Button
              type="button"
              size="lg"
              disabled={nextDisabled}
              onClick={onNext}
            >
              {nextLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
