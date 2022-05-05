# Setup Earthly

Setup Earthy build system.

## Example usage

```yaml
uses: drugscom/setup-earthly-action@v1
with:
  version: 0.6.12
  download-latest: true
  matchers: |
    parallel-lint
    phpcs
```
