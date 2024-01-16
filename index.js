// require the library, main export is a function
const core = require('@actions/core');
const fs = require('fs').promises;
const path = require('path');
const simpleGit = require('simple-git');
const exeq = require('exeq');
const repositoryUrl = "https://github.com/pyenv/pyenv.git";
const destinationPath = path.resolve("pyenv");

try {
simpleGit()
    .clone(repositoryUrl, destinationPath)
    .then(core.info("Cloning of PyEnv successful."));
} catch(error) {
    core.setFailed(error.message);
}

fs.access(destinationPath, fs.constants.F_OK)
    .then(() => {
        core.debug(`Cloned pyenv to ${destinationPath}`);
    })
    .catch(() => {
        core.setFailed("Cloning of pyenv failed.");
    });

const python_version = core.getInput('python-version');
const setup_poetry = core.getInput('setup-poetry');

exeq(
    core.toPlatformPath(`${destinationPath}/bin/pyenv`),
    'install',
    python_version
)
.then(function() {
    core.info(`Python ${python_version} was installed successfully`);
})
.catch(error => core.setFailed(error.message));


if (setup_poetry !== '') {
    exeq(
       core.toPlatformPath(`${destinationPath}/versions/${python_version}/bin/pip`),
        'install',
        'poetry'
    )
    .then(function() {
        core.info("Poetry setup successfully");
    })
    .catch(error => core.setFailed(error.message));
}