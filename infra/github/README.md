# GitHub repository settings (Terraform)

This stack manages the settings of this repository on GitHub: merge options, branch ruleset for `main`, Dependabot security settings and default workflow permissions. Changes go through a PR and `terraform plan` like any other infrastructure. Don't change these settings in the GitHub UI, because the next `plan` would revert them.

Run every command from `infra/github`. The owner runs `apply`, never Claude (see `infra/CLAUDE.md`).

## Credentials

- **GitHub:** a fine-grained personal access token, limited to this repository, with **Administration: Read and write** and an expiry. Paste it into the shell for the session only:

    ```bash
    read -rs GITHUB_TOKEN && export GITHUB_TOKEN
    ```

- **AWS (state bucket):** `export AWS_PROFILE=zuguangt`.

## First-time setup (adopting settings made in the UI)

1. **State bucket.** Run once, from `infra/bootstrap`:

    ```bash
    terraform init
    terraform apply -var="state_bucket_name=<globally-unique-name>"
    ```

2. **Backend.** Copy `backend.s3.tfbackend.example` to `backend.s3.tfbackend`, set the bucket name, then:

    ```bash
    terraform init -backend-config=backend.s3.tfbackend
    ```

3. **Generate configuration from what exists today** (for the resources in `imports.tf`; the `main` ruleset in `ruleset.tf` is new and created by this stack):

    ```bash
    terraform plan -generate-config-out=generated.tf
    ```

    Review `generated.tf`, move the resources into `main.tf`, and delete `generated.tf`.

4. **Plan until only the intended changes remain,** then apply.

## Day to day

```bash
terraform plan -out=github.tfplan   # review the diff (Claude reads it with `terraform show github.tfplan`)
terraform apply github.tfplan       # owner only; applies exactly the reviewed plan
```

Don't run `terraform init -upgrade` or `terraform providers lock` between `plan` and `apply`. A saved plan records the dependency lock file, and `apply` refuses a plan whose provider hashes differ.

Normally merge the PR first and apply from `main`, so `main` always describes what is live.

## Dependabot PRs and "Update branch"

The ruleset requires branches to be up to date with `main`. For a Dependabot PR, comment `@dependabot rebase`. Don't click "Update branch": it pushes a commit to Dependabot's branch, and Dependabot then stops maintaining it.

## Break glass

There are no bypass actors, so a broken required check blocks every PR, including the fix. Examples are a job renamed in `ci.yml` but not in `ruleset.tf`, or a GitHub Actions outage. `apply` does not need the change to be on `main`, so:

1. On a branch, fix `ruleset.tf`, or temporarily set `enforcement = "disabled"`.
2. `terraform plan -out=github.tfplan`, review, then `terraform apply github.tfplan`.
3. Merge the fix through a PR, and restore `enforcement = "active"` if it was disabled.
