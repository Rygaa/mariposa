<script lang="ts">
  import Button from "../../lib/components/Button.svelte";
  import Input from "../../lib/components/Input.svelte";
  import { navigate } from "svelte-routing";
  import { trpc } from "../../lib/trpc";
  import { _globalStore } from "../../store/globalStore.svelte";
  import Stepper from "../../lib/shadcn/Stepper.svelte";
  import {Card, CardContent, CardDescription, CardFooter, CardHeader,  CardTitle} from "../../lib/shadcn/Card/index";

  // Step management
  let currentStep: number = $state(0);
  let steps = $state([
    { label: "Enterprise", content: "" },
    { label: "Account", content: "" }
  ]);

  // Step 1: Enterprise data
  let enterpriseName = $state("");
  
  // Step 2: User account data
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let firstName = $state("");
  let lastName = $state("");

  // Validation errors
  let enterpriseNameError = $state("");
  let emailError = $state("");
  let passwordError = $state("");
  let confirmPasswordError = $state("");
  let generalError = $state("");

  let isSubmitting = $state(false);

  function validateStep1(): boolean {
    enterpriseNameError = "";
    generalError = "";

    if (!enterpriseName.trim()) {
      enterpriseNameError = "Enterprise name is required";
      return false;
    }

    return true;
  }

  function validateStep2(): boolean {
    emailError = "";
    passwordError = "";
    confirmPasswordError = "";
    generalError = "";

    if (!email.trim()) {
      emailError = "Email is required";
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailError = "Please enter a valid email address";
      return false;
    }

    if (!password) {
      passwordError = "Password is required";
      return false;
    }

    if (password.length < 8) {
      passwordError = "Password must be at least 8 characters";
      return false;
    }

    if (!confirmPassword) {
      confirmPasswordError = "Please confirm your password";
      return false;
    }

    if (password !== confirmPassword) {
      confirmPasswordError = "Passwords do not match";
      return false;
    }

    return true;
  }

  function handleNext() {
    if (currentStep === 0 && validateStep1()) {
      currentStep = 1;
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      currentStep--;
      generalError = "";
    }
  }

  async function handleSubmit() {
    if (!validateStep2()) {
      return;
    }

    isSubmitting = true;
    generalError = "";

    try {
      const result = await trpc.signup.mutate({
        email,
        password,
      });

      if (result.success) {
        _globalStore.setAuthToken(result.authToken);
        _globalStore.user = result.user;
        
        navigate("/profile", { replace: true });
      } else {
        generalError = result.message ?? "Signup failed";
      }
    } catch (error: any) {
      generalError = error.message || "An error occurred during signup";
    }

    isSubmitting = false;
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 w-full"
>
  <div class="w-full max-w-2xl">
    <Card>
      <CardHeader>
        <div class="text-center w-full">
          <CardTitle>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          </CardTitle>
          <CardDescription>
            Get started with your business
          </CardDescription>
        </div>
      </CardHeader>

      <div class="px-6 pb-6">
        <!-- Stepper Component -->
        <div class="mb-6 -mx-6">
          <Stepper {steps} bind:currentStep />
        </div>

        <!-- Error Message -->
        {#if generalError}
          <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <p class="text-sm text-red-800">{generalError}</p>
            </div>
          </div>
        {/if}

        <!-- Step Forms -->
        {#if currentStep === 0}
          <div class="space-y-6">
            <div class="space-y-4">
              <Input
                label="Business Name"
                type="text"
                bind:value={enterpriseName}
                placeholder="Acme Corporation"
                error={enterpriseNameError}
                autocomplete="organization"
              />
            </div>

            <!-- Step 1 Actions -->
            <div class="flex justify-between pt-4">
              <Button
                type="button"
                variant="secondary"
                onclick={() => navigate("/login")}
              >
                Back to Login
              </Button>
              <Button
                type="button"
                variant="primary"
                onclick={handleNext}
              >
                Continue
              </Button>
            </div>
          </div>
        {:else if currentStep === 1}
          <div class="space-y-6">
            <!-- Step 2: User Account Information -->
            <Card class="bg-green-50 border-green-200">
              <div class="p-4">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                  <div>
                    <h3 class="text-sm font-semibold text-green-900 mb-1">Your Account</h3>
                    <p class="text-sm text-green-700">
                      Create your personal account to access <strong>{enterpriseName}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div class="space-y-4">

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  type="text"
                  bind:value={firstName}
                  placeholder="John"
                  autocomplete="given-name"
                />

                <Input
                  label="Last Name"
                  type="text"
                  bind:value={lastName}
                  placeholder="Doe"
                  autocomplete="family-name"
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                bind:value={email}
                placeholder="you@example.com"
                error={emailError}
                autocomplete="email"
              />

              <Input
                label="Password"
                type="password"
                bind:value={password}
                placeholder="Minimum 8 characters"
                error={passwordError}
                autocomplete="new-password"
              />

              <Input
                label="Confirm Password"
                type="password"
                bind:value={confirmPassword}
                placeholder="Re-enter your password"
                error={confirmPasswordError}
                autocomplete="new-password"
              />

              <div class="text-xs text-gray-500 mt-2">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </div>
            </div>

            <!-- Step 2 Actions -->
            <div class="flex justify-between pt-4">
              <Button
                type="button"
                variant="secondary"
                onclick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onclick={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <CardFooter>
        <div class="w-full text-center">
          <p class="text-sm text-gray-600">
            Already have an account?
            <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </CardFooter>
    </Card>
  </div>
</div>
