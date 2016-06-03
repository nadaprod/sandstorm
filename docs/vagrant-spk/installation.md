# Installation

Before we install `vagrant-spk`, some advice for how to succeed at the
installation process.

* Learn about Sandstorm, if you haven't already. [Try using Sandstorm at our demo server](https://demo.sandstorm.io) to get a feel for how it operates.
* Open a "terminal" on your Mac or Linux system or "command prompt" on Windows.
* Don't use sudo unless we tell you to!

**System requirements**: `vagrant-spk` requires a 64-bit computer with
at least 1GB of RAM. Your computer probably is fine. We've tested this
tutorial on Mac OS and GNU/Linux, and partly-tested on Windows.

## Ensure git is installed

In this tutorial, we use git to download some code, so you need it on your computer.

In the terminal, type the following and press enter.

```bash
git --version
```

You should see a message like:

```bash
git version x.y.z
```

If so, git is properly installed and you can skip this section.

If you saw instead a message like:

```bash
git: Command not found.
```

Then you need to install git via the following instructions.

* On Mac OS, visit the [official git for Mac download page](https://git-scm.com/download/mac) and follow their instructions.
* On Ubuntu or Debian, run: `sudo apt-get install git`. (On other Linux systems, use your package manager to install git.)
* On Windows, git is optional. Consider installing it via the [msysgit installer](https://msysgit.github.io/).


## Ensure Vagrant is installed

In this tutorial, we use Vagrant (along with other tools) to create a Linux
virtual machine where your app will run, alongside Sandstorm.

To check if it is installed, in the terminal, type the following and press enter.

```bash
vagrant version
```

You should see a message like:

```bash
Installed Version: 1.7.2
```

If so, Vagrant is installed properly, and you can skip the rest of this section.

If instead you see a message like:

```bash
vagrant: Command not found.
```

Then you need to install Vagrant by doing the following.

* On Mac OS or Linux or Windows, visit the [official Vagrant
  website](http://vagrantup.com/) and follow their instructions to
  install it.


## Ensure VirtualBox is installed

In this tutorial, we use VirtualBox to emulate a computer on which we run Linux, controlled via
Vagrant.

**Windows users:** To check if VirtualBox is properly installed on Windows systems, press the
Windows key on your keyboard. This should open a program launcher. Type "virtualbox" into the
program launcher. If you see a program you can launch whose name resembles "Oracle VirtualBox", then
you can can skip to the next section. If not, then you will need to keep reading this section and
install VirtualBox.

**Mac OS or Linux users:** To check if VirtualBox is installed properly on Mac OS or Linux systems,
in the terminal, type the following and press enter:

```bash
VirtualBox --help
```

You should see a lot of output, for example:

```bash
Oracle VM VirtualBox Manager x.y.z
(C) 2005-2015 Oracle Corporation
All rights reserved.
```

If so, skip the rest of this section, as VirtualBox is already properly installed.

If you saw instead:

```bash
VirtualBox: Command not found.
```

**All operating systems:** To install VirtualBox, you can do the following:

* Visit the [VirtualBox downloads page](https://www.virtualbox.org/wiki/Downloads)
* In the **top**, underneath **VirtualBox platform packages**, find the package for your operating system. Click the link, download, and install it.
* Once you are done with that, go to the top of this section and make sure VirtualBox is installed.

## No need to install Sandstorm directly

You do _not_ need Sandstorm installed on your computer before you
start packaging an app. Sandstorm's `vagrant-spk` helper tool handles
installing it for you.

It creates a Sandstorm install unique to each app you are developing.

## Install `vagrant-spk`

Finally, you can install `vagrant-spk` itself. This tool uses Vagrant
and VirtualBox so that you can run your app within Sandstorm on a
Linux virtual machine.

### Windows users

Visit the [vagrant-spk releases
list](https://github.com/sandstorm-io/vagrant-spk/releases) and run
the Windows installer (`vagrant-spk-setup-v0.xyy.exe`). It may need
administrator privileges to successfully install.

### Mac OS or Linux

In your terminal, run the following commands to download and install `vagrant-spk`.

```bash
mkdir -p ~/projects
cd ~/projects
git clone git://github.com/sandstorm-io/vagrant-spk
cd vagrant-spk
sudo ln -s $PWD/vagrant-spk /usr/local/bin
```

(Note: If you prefer different paths, that is OK.)
