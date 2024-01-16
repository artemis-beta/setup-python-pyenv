// require the library, main export is a function
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const gitPullOrClone = require('git-pull-or-clone');
const { exec } = require('child_process');
const repositoryUrl = "https://github.com/pyenv/pyenv.git";
const destinationPath = path.resolve("pyenv");
const python_version = core.getInput('python-version');
const setup_poetry = core.getInput('setup-poetry');

gitPullOrClone(repositoryUrl, destinationPath, (error) => {
    if (error) core.setFailed(error.message);

    const pyenvBinary = path.join(destinationPath, "bin", "pyenv");

    try {
        fs.existsSync(pyenvBinary, fs.constants.F_OK);
        core.debug(`Cloned pyenv to ${destinationPath}`);
        exec(
            `${pyenvBinary} install ${python_version}`,
            (error, _, __) => {
                if (error) core.setFailed(error.message);
                core.info(`Python ${python_version} was installed successfully`);
                if (setup_poetry !== '') {
                    pythonPipExe = core.toPlatformPath(`${destinationPath}/versions/${python_version}/bin/pip`);
                    exec(
                        `${pythonPipExe} install poetry`,
                        (error, _, __) => {
                            if (error) core.setFailed(error.message);
                            core.info("Poetry setup successfully");
                        }
                    )
                }
            }
        );
    } catch(error) {
        core.setFailed(`Cloning of pyenv failed: ${error}`);
    }
});
