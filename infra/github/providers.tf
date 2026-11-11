# Authentication: the provider reads the GITHUB_TOKEN environment variable.
# Use a fine-grained personal access token scoped to this repository only, with
# "Administration: Read and write", and an expiry. Never put the token in a file:
#   read -rs GITHUB_TOKEN && export GITHUB_TOKEN
provider "github" {
  owner = var.owner
}
