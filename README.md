# snyk-monitor-test

A **small demo repository** for teaching and testing **Snyk in continuous integration**: Open Source (SCA) scanning, **SARIF** output, **Snyk Code** (`--report` to the Snyk UI), and **`snyk monitor`** snapshots. The same logical pipeline is expressed for several CI systems under **`examples/`**, with a **canonical GitHub Actions** workflow at **`.github/workflows/`**.

This is **not** production-ready code. Dependencies and sample source are **intentionally vulnerable or insecure** so scans produce visible results in Snyk and in CI logs.

---

## What this repo contains

| Area | Purpose |
|------|--------|
| **`package.json` / `package-lock.json`** | Pinned vulnerable dependency versions so **`snyk test`** / **`snyk monitor`** report OSS issues (e.g. high/critical). |
| **`src/insecure-demo.js`** | Intentional **Snyk Code** patterns (e.g. `eval`, SQL string building, path handling, placeholder “secret” string). **Do not** use real API keys or provider-shaped secrets—**GitHub push protection** will block pushes that look like live credentials. |

---

## Prerequisites (all pipelines)

1. A **Snyk account** and organization.
2. **`SNYK_TOKEN`** — Snyk API token (treat as a secret everywhere).
3. **`SNYK_ORG_ID`** — Organization ID or **slug** (as in the Snyk CLI `--org=` flag).

Configure tokens in your CI provider’s **secrets / variables** UI (GitHub **Actions secrets**, GitLab **CI/CD variables**, Azure **Pipeline variables**, etc.).

---

## Where each pipeline lives

| CI system | File path | How it is used |
|-----------|------------|----------------|
| **GitHub Actions** | [`.github/workflows/snyk-monitor.yml`](.github/workflows/snyk-monitor.yml) | Committed at this path; runs automatically on **`main`** pushes and **pull requests** targeting `main` when the repo is on GitHub. |
| **GitLab CI** | [`examples/.gitlab-ci.yml`](examples/.gitlab-ci.yml) | Copy to the repository root as **`.gitlab-ci.yml`** (or include it from your root file) so GitLab discovers it. |
| **Azure Pipelines** | [`examples/azure-pipelines.yml`](examples/azure-pipelines.yml) | Point an Azure DevOps pipeline at this file, or copy its contents into your YAML build. |
| **Jenkins** | [`examples/Jenkinsfile`](examples/Jenkinsfile) | Create a **Pipeline** job from SCM and set script path to this file, or copy it to repo root as **`Jenkinsfile`** if that matches your job. |
| **Harness** | [`examples/harness/snyk-security-scan.yaml`](examples/harness/snyk-security-scan.yaml) | Import in **Harness Pipeline Studio** (YAML) or store in Git and reference from Harness; adjust **`orgIdentifier`**, **`projectIdentifier`**, **`connectorRef`**, and **secret** identifiers to match your account. |
| **CircleCI** | [`examples/circleci/config.yml`](examples/circleci/config.yml) | Copy to **`.circleci/config.yml`** at the **repository root** (CircleCI only auto-loads that location). |
| **Bitbucket Pipelines** | [`examples/bitbucket-pipelines.yml`](examples/bitbucket-pipelines.yml) | Copy to the repository root as **`bitbucket-pipelines.yml`**. |
| **Buildkite** | [`examples/buildkite/pipeline.yml`](examples/buildkite/pipeline.yml) | Copy to **`.buildkite/pipeline.yml`** at the root, or register this path in your Buildkite pipeline settings. |

---

## What each pipeline does (shared steps)

Every variant follows the **same security scan story**:

1. **Checkout / workspace** — CI checks out your repository (implicit on some systems, explicit on others).

2. **Install Snyk CLI** — Downloads the Linux **`snyk`** binary (or uses a provider-specific install) and adds it to **`PATH`**.

3. **Node.js + dependencies** — Uses **Node 20** (or LTS where specified), runs **`npm ci`** from the lockfile.

4. **`snyk test` (Open Source)**  
   - Scans dependencies for known vulnerabilities.  
   - **`--severity-threshold=high`** — reporting focuses on high and above; the CLI may still exit **non-zero** when issues exist.  
   - **`--sarif-file-output=…`** — writes **`snyk.sarif`** for SARIF consumers.

5. **Publish SARIF (where supported)**  
   - **GitHub Actions**: uploads SARIF to **GitHub Code Scanning** via **`github/codeql-action/upload-sarif`**.  
   - **Azure Pipelines**: publishes **`snyk.sarif`** as a **pipeline artifact**.  
   - **GitLab / CircleCI / Bitbucket / Jenkins / Buildkite / Harness**: SARIF is produced as a file; **artifacts** or **archive** steps (or Harness artifact configuration) preserve it—see each file’s comments.

6. **`snyk code test --report` (Snyk Code)**  
   - Static analysis on first-party code; **`--report`** sends results to the **Snyk web UI**.  
   - Uses **`--project-name`**, **`--remote-repo-url`**, and **`--target-reference`** aligned with the repo/branch so Snyk can group the project with **`snyk monitor`**.  
   - The CLI exits **`1`** when open issues exist; in **GitHub Actions** and most **examples** scripts, **exit code `1` is treated as success for the job** so the demo pipeline stays green while still reporting to Snyk. Remove that mapping if you want the build to **fail** on Code findings.

7. **`snyk monitor` (Open Source snapshot)**  
   - Sends a dependency snapshot to Snyk so the **OSS project** stays current in the UI.  
   - Runs **`succeededOrFailed()` / `always()`-style** where implemented so a failing **`snyk test`** does not skip **`monitor`** (you still want the snapshot for demos).

There is **no final “fail the whole job” step** on GitHub Actions in the current design (intentional for a **demo** that always has findings). Re-introduce a strict gate if you want CI to turn red when Snyk reports issues.

---

## Platform-specific notes

### GitHub Actions (canonical)

- **Secrets**: `SNYK_TOKEN`, `SNYK_ORG_ID`.  
- **Permissions**: `security-events: write` for SARIF upload.  
- **Triggers**: `main` + PRs to `main`.  
- **Snyk UI**: **`snyk monitor`** updates the **Open Source** project; **`snyk code test --report`** updates the **Snyk Code** project—typically **two project rows** under the same repo **target**; that is **expected**.

### GitLab CI

- Variables: **`SNYK_TOKEN`**, **`SNYK_ORG_ID`** in **Settings → CI/CD → Variables**.  
- **Artifacts**: `snyk.sarif` with **`when: always`** (see file).

### Azure Pipelines

- Variables: **`SNYK_TOKEN`**, **`SNYK_ORG_ID`**.  
- Uses **`PublishPipelineArtifact`** instead of GitHub Code Scanning.

### Jenkins

- **Docker** agent with **`node:20-bookworm`**.  
- **Credentials** IDs **`snyk-token`** and **`snyk-org-id`** (Secret text)—rename in the `Jenkinsfile` if your IDs differ.  
- OSS test wrapped in **`catchError`** so the pipeline continues like **`continue-on-error`**.

### Harness

- Adjust **`connectorRef`** to your Docker/registry connector.  
- Secrets use **`<+secrets.getValue("account.snyk_token")>`** style paths—create matching secrets or change the expressions.  
- Repo metadata for Snyk is taken from **`git`** after clone.

### CircleCI

- Copy config to **`.circleci/config.yml`**.  
- Project **environment variables** for `SNYK_*`.  
- Workflow currently targets **`main`** only; PR behavior is configured in CircleCI **project settings** or by extending branch filters (see comment in the example).

### Bitbucket Pipelines

- **Repository variables** for `SNYK_*`.  
- **`pipelines.branches.main`** and **`pipelines.pull-requests`**.

### Buildkite

- **`docker`** plugin; ensure **`SNYK_TOKEN`** and **`SNYK_ORG_ID`** reach the step (pipeline env + **`propagate-environment: true`** in the example).

---

## Further reading

- [Snyk Monitor](https://docs.snyk.io/developer-tools/snyk-cli/commands/monitor)  
- [Snyk Code test (`--report`)](https://docs.snyk.io/developer-tools/snyk-cli/commands/code-test)  
- [GitHub push protection](https://docs.github.com/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/working-with-push-protection-from-the-command-line) (avoid real-looking secrets in commits)

---

## Cleanup after demos

Bump **dependencies** to patched versions, remove or replace **`src/insecure-demo.js`** with real, reviewed code, and turn **strict CI failure** back on when you no longer need intentional findings.
