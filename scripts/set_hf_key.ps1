param(
  [Parameter(Mandatory=$true)][string]$Key
)

# Sets HF_API_KEY for the current user via setx (persisted)
setx HF_API_KEY $Key
Write-Host "HF_API_KEY set for current user. Restart your terminal to pick up the new variable."
Write-Host "Alternatively, paste the key in .env under HF_API_KEY (do not commit .env to source control)."}