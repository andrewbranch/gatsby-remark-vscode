workflow "build, test and publish on release" {
  on = "push"
  resolves = "publish"
}

action "check for new tag" {
  uses = "actions/bin/filter@master"
  args = "tag"
}

action "pull submodules" {
  needs = "check for new tag"
  uses = "docker://node:10"
  runs = "git"
  args = "submodule update --init"
}

action "install" {
  uses = "docker://node:10"
  needs = "pull submodules"
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

action "publish" {
  needs = ["build", "test"]
  uses = "actions/npm@1.0.0"
  args = "publish"
  secrets = ["NPM_TOKEN"]
}
