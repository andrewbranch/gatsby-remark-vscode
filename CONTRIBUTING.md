# Contributing

## Code of Conduct

Please note that this project is released with a Contributor [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Open an issue

PRs introducing new ideas are always welcome, but might be declined if opened without any prior discussion. To avoid wasted work, it’s always best to [open an issue](https://github.com/andrewbranch/gatsby-remark-vscode/issues/new) first.

## Local development setup

Prerequisites: development is supported on the current [Node LTS](https://nodejs.org/). Yarn is probably required to run all tests correctly, because npm fails to deduplicate certain dependencies which causes issues for running the GraphQL tests.

1. Fork and clone the repo.
2. Run `yarn`

Running `yarn` should automatically initialize or update the [vscode](./vscode) submodule, generate `src/graphql/schema.d.ts`, and populate [`lib/grammars`](lib/grammars) and [`lib/themes`](lib/themes). If any of these things are missing, you’ll get errors when you try to run things later. You can rerun these steps with `yarn build`.

## Tests

To run tests, run `yarn test`. You can use any Jest CLI options. For example, to run just the test named “code-fence-meta”, use `yarn test -t code-fence-meta`.

Most tests are either Jest snapshot tests or HTML baseline tests against a known-good source ([`test/html/cases/baselines`](test/html/baselines)). To update the snapshots and baselines, run `yarn test -u`.

Most new tests can be baseline tests. To write one, create a new folder in `test/cases`, then put a Markdown file named `test.md` inside. If you want to run the plugin with custom options, place an `options.js` file whose `module.exports` is the options object to be passed to the plugin. Then, when you next run `yarn test`, the baseline will be created and opened in a browser so you can view the resulting HTML. If it looks right, commit it and you’re done. If it looks wrong, you can overwrite the bad baseline by running `yarn test -u -t name-of-test` after you’ve made changes to fix your code.

Tests inside `test/cases` also generate a snapshot of a GraphQL query for the structured syntax highlighting data the plugin generates. The snapshot has a lot of data, so if you’re adding a new test case, don’t worry about manually inspecting every line of the added snapshot. They exist mostly to detect regressions, so if the snapshot looks plausibly correct, go ahead and commit it.

## Debugging

VS Code launch scripts have been provided, so you can debug the tests or the [example site](examples/example-site) by using VS Code’s debug menu. Otherwise, you can always run `node --inspect-brk node_modules/.bin/jest --runInBand` and attach with whatever debugger you like.

## Get ready for a PR

When you’ve made changes you’re happy with, ensure that you have

- Added a test if appropriate,
- Formatted your changes through Prettier with `yarn format`,
- Maintained good JSDoc type annotations to the best of your ability.

This project is written in plain JavaScript, but uses TypeScript to type-check via JSDoc annotations. After tests, type checking runs (and can be run alone with `yarn check`). If types are new to you, or you have trouble getting type checking to pass, that’s ok! I’ll help you in your PR if necessary. Type checking is a great way to catch errors early, but I don’t want it to be an impediment for anyone’s contribution.
