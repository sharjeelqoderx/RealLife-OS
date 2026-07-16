@echo off
setlocal

set "STRIPE_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe"

if not exist "%STRIPE_EXE%" (
  echo Stripe CLI not found at:
  echo   %STRIPE_EXE%
  echo.
  echo Install with: winget install Stripe.StripeCLI
  exit /b 1
)

echo Using: %STRIPE_EXE%
echo Forwarding to http://localhost:3000/api/stripe/webhook
echo.
"%STRIPE_EXE%" listen --forward-to localhost:3000/api/stripe/webhook
