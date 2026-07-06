export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) {
    return 0
  }

  let score = 0

  if (password.length >= 8) {
    score++
  }

  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) {
    score++
  }

  if (/[^A-Za-z0-9]/.test(password) && password.length >= 10) {
    score++
  }

  return score as 0 | 1 | 2 | 3
}
