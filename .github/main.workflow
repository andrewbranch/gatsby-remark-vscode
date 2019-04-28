workflow "build, test and publish on release" {
  on = "push"
  resolves = "publish"
}

action "install" {
  uses = "node:10"
  runs = "npm"
  args = "install"
}

action "build" {
  needs = "install"
  uses = "actions/npm@1.0.0"
  args = "run build"
}

action "test" {
  needs = "install"
  uses = "actions/npm@1.0.0"
  args = "test"
}

# filter for a new tag
action "check for new tag" {
  needs = ["test", "build"]
  uses = "actions/bin/filter@master"
  args = "tag"
}

action "publish" {
  needs = "check for new tag"
  uses = "actions/npm@1.0.0"
  args = "publish"
  secrets = ["NPM_AUTH_TOKEN"]
}