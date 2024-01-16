// require the library, main export is a function
const core = require('@actions/core');
const fs = require('fs');
const semver = require('semver');
const path = require('path');
const gitPullOrClone = require('git-pull-or-clone');
const { execSync } = require('child_process');
const { stdout, exit } = require('process');
const repositoryUrl = "https://github.com/pyenv/pyenv.git";
const destinationPath = path.resolve("pyenv");
const python_version = core.getInput('python-version');
const setup_poetry = core.getInput('setup-poetry');

const execOptions = {
    encoding: 'utf8', // Set the encoding of the output
};

if (semver.valid(python_version) === null) {
    core.setFailed(`⛔ Invalid semantic version '${python_version}'`);
    exit(1);
}

core.startGroup("Setup PyEnv");

gitPullOrClone(repositoryUrl, destinationPath, (error) => {
    if (error) core.setFailed(error.message);

    const pyenvBinary = path.join(destinationPath, "bin", "pyenv");

    if (!fs.existsSync(pyenvBinary, fs.constants.F_OK)) {
        core.setFailed(`❌ Cloning of pyenv failed: ${error}`);
        exit(1);
    }

    core.debug(`🗂️  Cloned pyenv to ${destinationPath}`);

    try {
        let std_out = execSync(`${pyenvBinary} install --list`, execOptions);
        if (!std_out.includes(python_version)) {
            core.setFailed(`❓ Cannot install Python '${python_version}', version not available.`);
            exit(1);
        }
    } catch (error) {
        core.setFailed(`❌ Failed to retrieve available python versions: ${error.message}`);
        exit(1);
    }

    try {
        execSync(`${pyenvBinary} install ${python_version}`, execOptions);
    } catch (error) {
        core.setFailed(`❌ Python install failed: ${error.message}`);
        exit(1);
    }

    core.info(`🐍 Python ${python_version} was installed successfully`);
    core.endGroup();

    pythonBinDir =  core.toPlatformPath(`${destinationPath}/versions/${python_version}/bin`);

    if (setup_poetry !== '') {
        core.startGroup("Setup Poetry");
        pythonPipExe = path.join(pythonBinDir, "pip");
        try {
            execSync(`${pythonPipExe} install poetry`, execOptions);
        } catch (error) {
            core.setFailed(`❌ Failed to install Poetry: ${error.message}`);        
        }

        core.info("📖 Poetry setup completed successfully.");
        core.addPath(pythonBinDir);
        core.endGroup();
    };
    core.startGroup("Updating environment");
    core.info("🛫 Exporting environment variables");
    core.endGroup();

});
