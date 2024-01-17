// require the library, main export is a function
const core = require('@actions/core');
const fs = require('fs');
const os = require('os');
const semver = require('semver');
const path = require('path');
const gitPullOrClone = require('git-pull-or-clone');
const { execSync } = require('child_process');
const { exit } = require('process');
const repositoryUrl = "https://github.com/pyenv/pyenv.git";
const destinationPath = path.resolve(".pyenv");
let python_version = core.getInput('python-version');
let setup_poetry = core.getInput('use-poetry') == 'true';
let setup_venv = core.getInput('setup-venv') == 'true';
let poetry_args = core.getInput('poetry-args');
const operating_system = os.platform();
const flag = process.argv[2];

if (flag === "--test") {
    python_version = '3.10.5';
    setup_poetry = true;
    setup_venv = true;
    poetry_args = "";
}

var execOptions = {
    encoding: 'utf8', // Set the encoding of the output
};

if (semver.valid(python_version) === null) {
    core.setFailed(`⛔ Invalid semantic version '${python_version}'`);
    exit(1);
}

pyenvBinary = path.join(destinationPath, "bin", "pyenv");

core.startGroup("Setup PyEnv");
if (operating_system === 'win32') {
    execOptions['shell'] = 'powershell.exe';
    execOptions['env'] = {...process.env, USERPROFILE: process.cwd()};
    core.info("🪟  Platform is Windows, will install 'pyenv-win'");
    let installCmd = 'Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"; &"./install-pyenv-win.ps1"';
    try {
        execSync(installCmd, execOptions);
    } catch(error) {
        core.setFailed(`❌ Failed to install pyenv-win: ${error}`);
        exit(1);
    }
    pyenvBinary = path.join(destinationPath, "pyenv-win", "bin", "pyenv.bat");
} else {
    gitPullOrClone(repositoryUrl, destinationPath, (error) => {
        if (error) {
            core.setFailed(error.message);
            exit(1);
        }
    });
}

if (!fs.existsSync(pyenvBinary, fs.constants.F_OK)) {
    core.setFailed(`❌ Installation of pyenv failed, binary not found at ${pyenvBinary}.`);
    exit(1);
}

core.debug(`🗂️  Installed pyenv to ${destinationPath}`);
core.debug(`👈 using pyenv binary '${pyenvBinary}'`);
core.info("🌞 Pyenv installed successfully.")

try {
    let std_out = execSync(`${pyenvBinary} install --list`, execOptions);
    core.info(`🔍 Checking '${python_version}' against available Python versions`);
    if (!std_out.includes(python_version)) {
        core.setFailed(`❓ Cannot install Python '${python_version}', version not available.`);
        exit(1);
    }
} catch (error) {
    core.setFailed(`❌ Failed to retrieve available python versions: ${error.message}`);
    exit(1);
}

try {
    core.info(`⬇️  Installing Python ${python_version}`)
    execSync(`${pyenvBinary} install ${python_version}`, execOptions);
} catch (error) {
    core.setFailed(`❌ Python install failed: ${error.message}`);
    exit(1);
}

core.info(`🐍 Python ${python_version} was installed successfully`);
core.endGroup();

pythonBinDir =  core.toPlatformPath(`${destinationPath}/versions/${python_version}/bin`);
pythonPipExe = path.join(pythonBinDir, "pip");

if (operating_system === 'win32') {
    pythonBinDir = core.toPlatformPath(`${destinationPath}/pyenv-win/versions/${python_version}/Scripts`);
    pythonPipExe = path.join(pythonBinDir, "pip.exe");
}

if (setup_poetry !== '') {
    core.startGroup("Setup Poetry");
    if (typeof setup_poetry == "string") {
        install_poetry = `poetry==${setup_poetry}`;
    } else {
        install_poetry = 'poetry';
    }
    try {
        execSync(`${pythonPipExe} install ${install_poetry} --no-warn-script-location --disable-pip-version-check`, execOptions);
    } catch (error) {
        core.setFailed(`❌ Failed to install Poetry: ${error.message}`);
        exit(1);     
    }

    try {
        stdout = execSync(`${pythonPipExe} freeze`, execOptions);
    } catch (error) {
        core.setFailed(`❌ Failed to retrieve Poetry version: ${error.message}`);
        exit(1);     
    }

    let matches = stdout.match("poetry==(.+)");
    let poetryBinary = path.join(pythonBinDir, "poetry");

    core.info(`📖 Poetry ${matches[0]} setup completed successfully.`);
    core.endGroup();
    if (setup_venv) {
        core.startGroup("Setup Virtual Environment");
        core.debug("🔧 Setting virtual environment path to project directory.");
        try {
            execSync(`${poetryBinary} config virtualenvs.in-project`, execOptions);
        } catch (error) {
            core.setFailed(`❌ Failed to configure Poetry: ${error.message}`);
            exit(1);     
        }
        core.info("🌍 Installing Poetry project to virtual environment.");
        try {
            execSync(`${poetryBinary} install ${poetry_args}`, execOptions);
        } catch (error) {
            core.setFailed(`❌ Failed to install project using Poetry: ${error.message}`);
            exit(1);     
        }
        core.endGroup();
    }
} else {
    if (setup_venv) {
        core.startGroup("Setup Virtual Environment");
        core.info("🌍 Creating virtual environment using 'venv'.");
        try {
            execSync(`${pythonPipExe} -m venv .venv`, execOptions);
        } catch (error) {
            core.setFailed(`❌ Failed to initialise virtual environment: ${error.message}`);
            exit(1);     
        }
        core.endGroup();
    }
}
core.startGroup("Updating environment");
core.info("🛫 Exporting environment variables");
core.addPath(pythonBinDir);
core.endGroup();
