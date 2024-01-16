// require the library, main export is a function
const core = require('@actions/core');
const simpleGit = require('simple-git');
const exeq = require('exeq');
const repositoryUrl = "https://github.com/pyenv/pyenv.git";
const destinationPath = "~/.pyenv";

try {
    simpleGit()
        .clone(repositoryUrl, destinationPath)
        .then(console.log("Cloning of PyEnv successful."));
    const python_version = core.getInput('python-version');
    const setup_poetry = core.getInput('setup-poetry');
    exeq(
        '~/.pyenv/bin/pyenv',
        'install',
        python_version
    ).then(function() {
        console.log(`Python ${python_version} was installed successfully`);
    })

    if (setup_poetry !== '') {
        exeq(
            `~/.pyenv/versions/${python_version}/bin/pip`,
            'install',
            'poetry'
        ).then(function() {
            console.log("Poetry setup successfully");
        })
    }
} catch(error) {
    core.setFailed(error.message);
}