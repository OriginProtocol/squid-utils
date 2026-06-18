# @originprotocol/squid-utils

Shared utilities for Origin Protocol Subsquid projects.

## Publishing

Packages are published to GitHub Packages by the `Publish package` GitHub
Actions workflow.

1. Create a GitHub Release with a semantic-version tag such as `v1.2.3`.
2. Publish the release. Creating the tag triggers the publish workflow.
3. The workflow removes the `v` prefix, sets the package version to `1.2.3`,
   builds the package, and publishes it to GitHub Packages.

Each version can be published only once. Use a new tag for every release.
