"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Info, RefreshCw } from "lucide-react"

import { CloudflareOneAppHeader } from "@/app/(protected)/devices/_components/cloudflare-one-app-header"
import { CopyField } from "@/app/(protected)/devices/_components/copy-field"
import { QrCodePlaceholder } from "@/app/(protected)/devices/_components/qr-code-placeholder"
import {
  DEVICE_SETUP_IMAGES,
  SetupGuideImage,
} from "@/app/(protected)/devices/_components/setup-guide-image"
import { WizardProgressFooter } from "@/app/(protected)/devices/_components/wizard-progress-footer"
import { WizardSubStep } from "@/app/(protected)/devices/_components/wizard-sub-step"
import { ErrorAlert } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import type {
  DeviceAppPreferences,
  DeviceEnrollmentInfo,
} from "@/schemas/devices/api"
import {
  DNS_LEAK_TEST_URL,
  getPlatformLabel,
  getStoreLabel,
  type DevicePlatform,
} from "@/schemas/devices/device"

const TOTAL_STEPS = 4

export interface CloudflareOneWizardProps {
  platform: DevicePlatform
  initialStep?: number
  enrollmentInfo: DeviceEnrollmentInfo | null
  initialAppPreferences: DeviceAppPreferences
}

export function CloudflareOneWizard({
  platform,
  initialStep = 1,
  enrollmentInfo,
  initialAppPreferences,
}: CloudflareOneWizardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(initialStep)

  const enrollmentQuery = useQuery({
    queryKey: queryKeys.devices.enrollmentInfo(),
    queryFn: () => apiClient<DeviceEnrollmentInfo>("/api/devices/enrollment-info"),
    initialData: enrollmentInfo ?? undefined,
  })

  const info = enrollmentQuery.data
  const teamName = info?.teamName ?? "your-team"
  const installEmails =
    info?.installEmails.length ? info.installEmails : ["admin@example.com"]
  const storeUrl = info?.storeUrls[platform] ?? getStoreUrlFallback(platform)

  const [selectedEmail, setSelectedEmail] = useState(installEmails[0] ?? "")
  const [lockFilterSwitch, setLockFilterSwitch] = useState(
    initialAppPreferences.lockFilterSwitch
  )
  const [preventLogout, setPreventLogout] = useState(
    initialAppPreferences.preventLogout
  )

  const saveStepMutation = useMutation({
    mutationFn: (step: number) =>
      apiClient("/api/devices/setup-session", {
        method: "PATCH",
        body: JSON.stringify({ platform, cloudflareWizardStep: step }),
      }),
  })

  const savePreferencesMutation = useMutation({
    mutationFn: (payload: {
      lockFilterSwitch?: boolean
      preventLogout?: boolean
    }) =>
      apiClient<DeviceAppPreferences>("/api/devices/app-preferences", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  })

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(step)
      saveStepMutation.mutate(step)
    },
    [saveStepMutation]
  )

  const platformLabel = getPlatformLabel(platform)
  const storeLabel = getStoreLabel(platform)

  function getStoreUrlFallback(devicePlatform: DevicePlatform) {
    return devicePlatform === "android"
      ? "https://play.google.com/store/apps/details?id=com.cloudflare.cloudflareone"
      : "https://apps.apple.com/app/cloudflare-one/id6443476492"
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col">
      <Button variant="ghost" size="sm" asChild className="-ms-2 mb-4 self-start">
        <Link href={`/devices/setup?platform=${platform}`}>
          <ArrowLeft aria-hidden className="size-4" />
          Back to device setup
        </Link>
      </Button>

      <CloudflareOneAppHeader platform={platform} />

      {!info?.tenantReady ? (
        <ErrorAlert message="Cloudflare tenant is not ready. Complete tenant provisioning before enrolling devices." />
      ) : null}

      {currentStep === 1 ? (
        <section className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-brand-text-heading">
              Download Cloudflare One App
            </h3>
          </div>

          <WizardSubStep
            step={1}
            title={`Open "Cloudflare One" ${storeLabel} Page`}
            description="This app will connect to your Content Policy"
          >
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-8">
              <QrCodePlaceholder caption="Scan this QR Code on your smartphone" />
              <div className="space-y-3 text-sm text-brand-text-muted">
                <p>
                  Open the {storeLabel} on your {platformLabel} device and search
                  for <strong className="text-brand-text-heading">Cloudflare One</strong>.
                </p>
                <Button asChild variant="brandOutline">
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                    Open {storeLabel}
                  </a>
                </Button>
              </div>
            </div>
          </WizardSubStep>

          <WizardSubStep step={2} title="Install the App">
            <div className="mx-auto max-w-sm space-y-4">
              <SetupGuideImage
                src={DEVICE_SETUP_IMAGES.cloudflareOneStoreListing}
                alt="Cloudflare One store listing — replace public/devices/cloudflare-one-store-listing.svg"
                width={480}
                height={160}
              />
              <SetupGuideImage
                src={DEVICE_SETUP_IMAGES.cloudflareOneScreenshot}
                alt="Cloudflare One app screenshot — replace public/devices/cloudflare-one-screenshot.svg"
                width={320}
                height={480}
                className="mx-auto max-w-[220px]"
              />
            </div>
          </WizardSubStep>
        </section>
      ) : null}

      {currentStep === 2 ? (
        <section className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-brand-text-heading">
              Connect Cloudflare Zero Trust
            </h3>
            <p className="mt-1 text-sm text-brand-text-muted">
              This associates your device with your Content Policy
            </p>
          </div>

          <WizardSubStep
            step={1}
            title="Copy your Team Name"
            description="You'll need to enter this into the app."
          >
            <CopyField value={teamName} />
          </WizardSubStep>

          <WizardSubStep
            step={2}
            title="Enter your Team Name"
            description="When prompted in the Cloudflare One app, enter your Team Name that you copied above."
          >
            <SetupGuideImage
              src={DEVICE_SETUP_IMAGES.orgNamePrompt}
              alt="Enter organization name prompt — replace public/devices/org-name-prompt.svg"
              width={360}
              height={480}
              className="mx-auto max-w-xs"
            />
          </WizardSubStep>

          <WizardSubStep
            step={3}
            title="Select who you are installing the app for"
            description="You will login to the app with this email address."
          >
            <div className="flex items-center gap-2">
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select email" />
                </SelectTrigger>
                <SelectContent>
                  {installEmails.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Refresh enrollment info"
                onClick={() =>
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.devices.enrollmentInfo(),
                  })
                }
              >
                <RefreshCw aria-hidden className="size-4" />
              </Button>
            </div>
          </WizardSubStep>

          <WizardSubStep
            step={4}
            title="Sign in when prompted"
            description={`You'll login the user ${selectedEmail} which you selected in the previous step.`}
          >
            <SetupGuideImage
              src={DEVICE_SETUP_IMAGES.accessLogin}
              alt="Cloudflare Access login — replace public/devices/access-login.svg"
              width={360}
              height={520}
              className="mx-auto max-w-xs"
            />
          </WizardSubStep>

          <WizardSubStep
            step={5}
            title="Get Login Pin"
            description="You will receive an email with a login code. Enter the code in the app to finish logging in."
          >
            <SetupGuideImage
              src={DEVICE_SETUP_IMAGES.loginPinEmail}
              alt="Login pin email screenshot — replace public/devices/login-pin-email.svg"
              width={480}
              height={360}
              className="mx-auto max-w-sm"
            />
          </WizardSubStep>
        </section>
      ) : null}

      {currentStep === 3 ? (
        <section className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-brand-text-heading">Test Connection</h3>
            <p className="mt-1 text-sm text-brand-text-muted">
              Ensure your device is connected to your Gateway Policy.
              {info ? (
                <>
                  {" "}
                  Enrolled devices on your account:{" "}
                  <strong>{info.enrolledDeviceCount}</strong>
                </>
              ) : null}
            </p>
          </div>

          <WizardSubStep
            step={1}
            title="Open the DNS Leak Test Page"
            description="Run a DNS leak test to verify that your device is connected to Cloudflare correctly."
          >
            <div className="flex flex-col items-center gap-4">
              <QrCodePlaceholder caption="Scan this QR Code on your smartphone" />
              <Button asChild variant="brandOutline" size="sm">
                <a href={DNS_LEAK_TEST_URL} target="_blank" rel="noopener noreferrer">
                  Open DNS Leak Test
                </a>
              </Button>
            </div>
          </WizardSubStep>

          <WizardSubStep
            step={2}
            title="Run a Standard Test"
            description="Either test will work, but a Standard Test is faster."
          >
            <SetupGuideImage
              src={DEVICE_SETUP_IMAGES.dnsLeakStandardTest}
              alt="DNS leak standard test — replace public/devices/dns-leak-standard-test.svg"
              width={560}
              height={320}
              className="mx-auto max-w-md"
            />
          </WizardSubStep>

          <WizardSubStep
            step={3}
            title="Check results for Cloudflare"
            description="The test results should show that your ISP is cloudflare."
          >
            <p className="mb-3 text-xs font-medium text-red-500">
              Cloudflare should appear in the ISP column
            </p>
            <SetupGuideImage
              src={DEVICE_SETUP_IMAGES.dnsLeakResults}
              alt="DNS leak results with Cloudflare ISP — replace public/devices/dns-leak-results.svg"
              width={640}
              height={280}
            />
          </WizardSubStep>
        </section>
      ) : null}

      {currentStep === 4 ? (
        <section className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-brand-text-heading">
              Customize App Settings
            </h3>
            <p className="mt-1 text-sm text-brand-text-muted">Enforce the app settings</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-brand-text-heading">
                Lock the Cloudflare App Filter Switch
              </h4>
              <Info aria-hidden className="size-4 text-brand-text-muted" />
            </div>
            <div className="rounded-xl border border-border bg-brand-surface/80 p-6">
              <div className="mx-auto flex w-fit items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                <Switch
                  id="lock-filter"
                  size="lg"
                  checked={lockFilterSwitch}
                  onCheckedChange={(checked) => {
                    setLockFilterSwitch(checked)
                    savePreferencesMutation.mutate({ lockFilterSwitch: checked })
                  }}
                />
                <Label htmlFor="lock-filter" className="font-medium">
                  Lock Filter Switch
                </Label>
              </div>
            </div>
            <p className="text-xs italic text-brand-text-muted">
              For your future reference: This setting is managed in your RealLife OS
              account &gt; Settings &gt; App Preferences.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-brand-text-heading">
                Prevent Logging Out of the Cloudflare App
              </h4>
              <Info aria-hidden className="size-4 text-brand-text-muted" />
            </div>
            <div className="rounded-xl border border-border bg-brand-surface/80 p-6">
              <div className="mx-auto flex w-fit items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                <Switch
                  id="prevent-logout"
                  size="lg"
                  checked={preventLogout}
                  onCheckedChange={(checked) => {
                    setPreventLogout(checked)
                    savePreferencesMutation.mutate({ preventLogout: checked })
                  }}
                />
                <Label htmlFor="prevent-logout" className="font-medium">
                  Prevent App Logout
                </Label>
              </div>
            </div>
            <p className="text-xs italic text-brand-text-muted">
              For your future reference: This setting is managed in your RealLife OS
              account &gt; Settings &gt; App Preferences.
            </p>
          </div>
        </section>
      ) : null}

      <WizardProgressFooter
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onPrevious={
          currentStep > 1 ? () => goToStep(currentStep - 1) : undefined
        }
        onNext={
          currentStep < TOTAL_STEPS ? () => goToStep(currentStep + 1) : undefined
        }
        onFinish={
          currentStep === TOTAL_STEPS
            ? () => {
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.devices.list(),
                })
                router.push("/devices")
              }
            : undefined
        }
      />
    </div>
  )
}
