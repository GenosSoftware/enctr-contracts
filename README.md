

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/LukaASoban/encountr">
    <img src="logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Encountr</h3>
</p>



<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

Encountr - the first ever dEsports platform running on Binance Smart Chain and Ethereum.


### Built With

Frameworks/Tools
* [Node](https://nodejs.org/en/)
* [Truffle](https://www.trufflesuite.com/)



<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these steps.

### Prerequisites

You will first need the latest version of node and npm.
* node
  ```sh
  sudo apt install nodejs
  ```
* npm
  ```sh
  sudo apt install npm
  ```
* truffle
  ```sh
  npm install -g truffle
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/LukaASoban/encountr.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```

<!-- USAGE EXAMPLES -->
## Usage

Once you have this all set up you will have to use the ganache-cli to fork the Binance Smart Chain network.

Open up a new terminal and execute:
  ```sh
  ganache-cli -f https://bsc-dataseed.binance.org -m MNEMONIC-BIP39-STYLE // -f is fork and -m is the mnemonic for your HD wallet (only use for development)
  ```

Then, open up another terminal window and run:

  ```sh
  truffle migrate --network develop // this is to take the contract in the contracts folder, compile and deploy to ganache
  ```
  
Once, you have this, the contract can be interacted with using truffle console.

  ```sh
  truffle console --network develop // interacting with the deployed contract on ganache-cli
  ```
  
Now, you can start interacting with the contract. Check out [Interacting with the Contract](https://www.trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts)
  ```sh
  let instance = await Encountr.deployed()
  instance.getBalance(accounts[0])
  ```
Check the Ecountr.sol file for the other functions that can be called.


<!-- ROADMAP -->
## Roadmap

See the [open issues](https://github.com/LukaASoban/encountr/issues) for a list of proposed features (and known issues).



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/othneildrew/Best-README-Template.svg?style=for-the-badge
[contributors-url]: https://github.com/othneildrew/Best-README-Template/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/othneildrew/Best-README-Template.svg?style=for-the-badge
[forks-url]: https://github.com/othneildrew/Best-README-Template/network/members
[stars-shield]: https://img.shields.io/github/stars/othneildrew/Best-README-Template.svg?style=for-the-badge
[stars-url]: https://github.com/othneildrew/Best-README-Template/stargazers
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/othneildrew/Best-README-Template/issues
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/othneildrew/Best-README-Template/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/othneildrew
[product-screenshot]: images/screenshot.png
