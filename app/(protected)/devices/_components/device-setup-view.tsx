"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react"

import { DeviceTypePicker } from "@/app/(protected)/devices/_components/device-type-picker"
import { IphoneSupervisedSettingsPreview } from "@/app/(protected)/devices/_components/iphone-supervised-settings-preview"
import { RadioOptionGroup } from "@/app/(protected)/devices/_components/radio-option-group"
import { SetupActionCard } from "@/app/(protected)/devices/_components/setup-action-card"
import { SetupStep } from "@/app/(protected)/devices/_components/setup-step"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import {
  CLOUDFLARE_MANAGED_ANDROID_DOCS,
  CLOUDFLARE_ONE_CLIENT_DOCS,
  type DevicePlatform,
  type DeviceSetupAnswers,
} from "@/schemas/devices/device"
import type { DeviceEnrollmentInfo, DeviceSetupSession } from "@/schemas/devices/api"

export interface DeviceSetupViewProps {
  initialPlatform: DevicePlatform
  initialSession: DeviceSetupSession
  enrollmentInfo: DeviceEnrollmentInfo | null
}

type QuestionnaireStep = {
  id: string
  title: string
  description?: string
  content: React.ReactNode
}

function buildAndroidSteps(
  platform: DevicePlatform,
  answers: DeviceSetupAnswers,
  setAnswers: (updater: (current: DeviceSetupAnswers) => DeviceSetupAnswers) => void
): QuestionnaireStep[] {
  const items: QuestionnaireStep[] = [
    {
      id: "is-managed",
      title: "Is your Android device managed?",
      description: "Managed Android devices are more reliable at preventing bypass.",
      content: (
        <RadioOptionGroup
          name="is-managed"
          value={answers.isManaged}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          onChange={(value) =>
            setAnswers((current) => ({ ...current, isManaged: value }))
          }
        />
      ),
    },
  ]

  if (answers.isManaged === "no") {
    items.push({
      id: "managed-mode-guide",
      title: "Consider enabling managed mode",
      description:
        "Managed mode is a more reliable way to prevent bypass on Android devices.",
      content: (
        <SetupActionCard
          href={CLOUDFLARE_MANAGED_ANDROID_DOCS}
          label="Follow our guide on how to enable managed mode"
          icon={GraduationCap}
        />
      ),
    })
  }

  items.push({
    id: "is-connected",
    title: "Is your Android device connected to your Content Policy?",
    content: (
      <RadioOptionGroup
        name="is-connected-to-policy"
        value={answers.isConnectedToPolicy}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        onChange={(value) =>
          setAnswers((current) => ({ ...current, isConnectedToPolicy: value }))
        }
      />
    ),
  })

  if (answers.isConnectedToPolicy === "no") {
    items.push({
      id: "connect-policy",
      title: "Connect an Android device to your Content Policy",
      description: "Ensure that content filtering is enabled on any internet connection.",
      content: (
        <SetupActionCard
          href={`/devices/setup/cloudflare-one?platform=${platform}`}
          label="Install VPN app"
          icon={Zap}
          external={false}
        />
      ),
    })
  }

  if (answers.isConnectedToPolicy === "yes") {
    items.push(...buildCertificateSteps(platform, answers, setAnswers))
  }

  return items
}

function buildIphoneSteps(
  platform: DevicePlatform,
  answers: DeviceSetupAnswers,
  setAnswers: (updater: (current: DeviceSetupAnswers) => DeviceSetupAnswers) => void
): QuestionnaireStep[] {
  const items: QuestionnaireStep[] = [
    {
      id: "is-supervised",
      title: "Is your iPhone / iPad supervised?",
      description:
        "Open up settings and confirm that the message \"This iPhone is supervised...\" appears at the top",
      content: (
        <div className="space-y-5">
          <RadioOptionGroup
            name="is-supervised"
            value={answers.isManaged}
            options={[
              { value: "yes", label: "Yes, it is supervised" },
              { value: "no", label: "No, it is not supervised" },
            ]}
            onChange={(value) =>
              setAnswers((current) => ({ ...current, isManaged: value }))
            }
          />
          <IphoneSupervisedSettingsPreview />
        </div>
      ),
    },
  ]

  if (answers.isManaged === "no") {
    items.push({
      id: "enable-supervised-mode",
      title: "Enable supervised mode",
      description:
        "This process only takes a few minutes and unlocks a more reliable way to prevent bypass on iOS devices.",
      content: (
        <SetupActionCard
          href="/devices/setup/andoff"
          label="Enable Supervised Mode"
          description="Takes less than 5 minutes and no data is lost."
          icon={Zap}
          external={false}
        />
      ),
    })
  }

  items.push({
    id: "is-connected",
    title: "Is your iPhone / iPad connected to your Content Policy?",
    content: (
      <RadioOptionGroup
        name="is-connected-to-policy"
        value={answers.isConnectedToPolicy}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        onChange={(value) =>
          setAnswers((current) => ({ ...current, isConnectedToPolicy: value }))
        }
      />
    ),
  })

  if (answers.isConnectedToPolicy === "no") {
    items.push({
      id: "connect-policy",
      title: "Connect an iPhone device to your Content Policy",
      description: "Ensure that content filtering is enabled on any internet connection.",
      content: (
        <SetupActionCard
          href={`/devices/setup/cloudflare-one?platform=${platform}`}
          label="Install VPN app"
          icon={Zap}
          external={false}
        />
      ),
    })
  }

  if (answers.isConnectedToPolicy === "yes") {
    items.push(...buildCertificateSteps(platform, answers, setAnswers))

    if (
      answers.certificateInstalled === "yes" ||
      answers.certificateInstalled === "skip"
    ) {
      items.push({
        id: "apple-shortcuts",
        title: "Enable Apple Shortcuts",
        description: "Use Apple Shortcuts to automatically connect the Cloudflare VPN.",
        content: (
          <SetupActionCard
            href="/devices/setup/apple-shortcuts"
            label="Enable Apple Shortcuts"
            description="Use Apple Shortcuts to automatically re-connect the Cloudflare VPN."
            icon={Wrench}
            external={false}
          />
        ),
      })
    }
  }

  return items
}

function buildCertificateSteps(
  platform: DevicePlatform,
  answers: DeviceSetupAnswers,
  setAnswers: (updater: (current: DeviceSetupAnswers) => DeviceSetupAnswers) => void
): QuestionnaireStep[] {
  const items: QuestionnaireStep[] = [
    {
      id: "certificate-question",
      title: "Have you installed and trusted the Cloudflare certificate?",
      description:
        "This is recommended so that you can see a helpful block page when a website is blocked.",
      content: (
        <RadioOptionGroup
          name="certificate-installed"
          value={answers.certificateInstalled}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "skip", label: "Skip for now" },
          ]}
          onChange={(value) =>
            setAnswers((current) => ({
              ...current,
              certificateInstalled: value,
            }))
          }
        />
      ),
    },
  ]

  if (answers.certificateInstalled === "no") {
    items.push({
      id: "certificate-install",
      title: "Certificate Setup",
      description: "Install and trust the certificate",
      content: (
        <SetupActionCard
          href={
            platform === "iphone"
              ? `/devices/setup/install-certificate?platform=${platform}`
              : "/api/dns-profile/mobileconfig"
          }
          label="Install Certificate"
          icon={ShieldCheck}
          external={platform !== "iphone"}
        />
      ),
    })
  }

  return items
}

export function DeviceSetupView({
  initialPlatform,
  initialSession,
  enrollmentInfo,
}: DeviceSetupViewProps) {
  const [platform, setPlatform] = useState<DevicePlatform>(initialPlatform)
  const [answers, setAnswers] = useState<DeviceSetupAnswers>(initialSession.answers)

  const saveSessionMutation = useMutation({
    mutationFn: (payload: {
      platform?: DevicePlatform
      answers?: DeviceSetupAnswers
    }) =>
      apiClient<DeviceSetupSession>("/api/devices/setup-session", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  })

  const persistAnswers = useCallback(
    (nextAnswers: DeviceSetupAnswers) => {
      saveSessionMutation.mutate({ platform, answers: nextAnswers })
    },
    [platform, saveSessionMutation]
  )

  const handlePlatformChange = useCallback(
    (nextPlatform: DevicePlatform) => {
      setPlatform(nextPlatform)
      saveSessionMutation.mutate({ platform: nextPlatform, answers })
    },
    [answers, saveSessionMutation]
  )

  const handleAnswersChange = useCallback(
    (updater: (current: DeviceSetupAnswers) => DeviceSetupAnswers) => {
      setAnswers((current) => {
        const next = updater(current)
        persistAnswers(next)
        return next
      })
    },
    [persistAnswers]
  )

  const steps = useMemo((): QuestionnaireStep[] => {
    const platformSteps =
      platform === "android"
        ? buildAndroidSteps(platform, answers, handleAnswersChange)
        : buildIphoneSteps(platform, answers, handleAnswersChange)

    return [
      {
        id: "select-device",
        title: "Select a Device",
        content: (
          <DeviceTypePicker
            selectedPlatform={platform}
            onSelect={handlePlatformChange}
          />
        ),
      },
      ...platformSteps,
    ]
  }, [answers, enrollmentInfo?.enrolledDeviceCount, handleAnswersChange, handlePlatformChange, platform])

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-2">
          <Link href="/devices">
            <ArrowLeft aria-hidden className="size-4" />
            Back to devices
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
          Device Setup
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
          Answer a few questions to connect your device with{" "}
          <a
            href={CLOUDFLARE_ONE_CLIENT_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-link underline-offset-4 hover:underline"
          >
            Cloudflare One
          </a>
          . Steps update based on your answers.
        </p>
      </div>

      <div className="max-w-3xl">
        {steps.map((step, index) => (
          <SetupStep
            key={step.id}
            step={index + 1}
            title={step.title}
            description={step.description}
            isLast={index === steps.length - 1}
          >
            {step.content}
          </SetupStep>
        ))}
      </div>
    </div>
  )
}
