import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
    EncountrERC20Token,
    EncountrERC20Token__factory,
    EncountrAuthority__factory,
} from "../../typechain";

describe("EncountrTest", () => {
    let deployer: SignerWithAddress;
    let vault: SignerWithAddress;
    let bob: SignerWithAddress;
    let alice: SignerWithAddress;
    let encountr: EncountrERC20Token;

    beforeEach(async () => {
        [deployer, vault, bob, alice] = await ethers.getSigners();

        const authority = await new EncountrAuthority__factory(deployer).deploy(
            deployer.address,
            deployer.address,
            deployer.address,
            vault.address
        );
        await authority.deployed();

        encountr = await new EncountrERC20Token__factory(deployer).deploy(authority.address);
    });

    it("correctly constructs an ERC20", async () => {
        expect(await encountr.name()).to.equal("Encountr");
        expect(await encountr.symbol()).to.equal("ENCTR");
        expect(await encountr.decimals()).to.equal(9);
    });

    describe("mint", () => {
        it("must be done by vault", async () => {
            await expect(encountr.connect(deployer).mint(bob.address, 100)).to.be.revertedWith(
                "UNAUTHORIZED"
            );
        });

        it("increases total supply", async () => {
            const supplyBefore = await encountr.totalSupply();
            await encountr.connect(vault).mint(bob.address, 100);
            expect(supplyBefore.add(100)).to.equal(await encountr.totalSupply());
        });
    });

    describe("burn", () => {
        beforeEach(async () => {
            await encountr.connect(vault).mint(bob.address, 100);
        });

        it("reduces the total supply", async () => {
            const supplyBefore = await encountr.totalSupply();
            await encountr.connect(bob).burn(10);
            expect(supplyBefore.sub(10)).to.equal(await encountr.totalSupply());
        });

        it("cannot exceed total supply", async () => {
            const supply = await encountr.totalSupply();
            await expect(encountr.connect(bob).burn(supply.add(1))).to.be.revertedWith(
                "ERC20: burn amount exceeds balance"
            );
        });

        it("cannot exceed bob's balance", async () => {
            await encountr.connect(vault).mint(alice.address, 15);
            await expect(encountr.connect(alice).burn(16)).to.be.revertedWith(
                "ERC20: burn amount exceeds balance"
            );
        });
    });
});
