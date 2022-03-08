import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MockSENCTR__factory, MockSENCTR } from "../../typechain";

describe("Mock sEnctr Tests", () => {
    // 100 sENCTR
    const INITIAL_AMOUNT = "100000000000";

    let initializer: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let sEnctr: MockSENCTR;

    beforeEach(async () => {
        [initializer, alice, bob] = await ethers.getSigners();

        // Initialize to index of 1 and rebase percentage of 1%
        sEnctr = await new MockSENCTR__factory(initializer).deploy("1000000000", "10000000");

        // Mint 100 sENCTR for intializer account
        await sEnctr.mint(initializer.address, INITIAL_AMOUNT);
    });

    it("should rebase properly", async () => {
        expect(await sEnctr.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sEnctr._agnosticBalance(initializer.address)).to.equal("100000000000");
        expect(await sEnctr.index()).to.equal("1000000000");

        await sEnctr.rebase();
        expect(await sEnctr._agnosticBalance(initializer.address)).to.equal("100000000000");
        expect(await sEnctr.balanceOf(initializer.address)).to.equal("101000000000");
        expect(await sEnctr.index()).to.equal("1010000000");
    });

    it("should transfer properly", async () => {
        expect(await sEnctr.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sEnctr._agnosticBalance(initializer.address)).to.equal("100000000000");

        //await sEnctr.approve(bob.address, INITIAL_AMOUNT);
        await sEnctr.transfer(bob.address, INITIAL_AMOUNT);

        expect(await sEnctr.balanceOf(initializer.address)).to.equal("0");
        expect(await sEnctr._agnosticBalance(initializer.address)).to.equal("0");

        expect(await sEnctr.balanceOf(bob.address)).to.equal(INITIAL_AMOUNT);
        expect(await sEnctr._agnosticBalance(bob.address)).to.equal("100000000000");
    });

    it("should transfer properly after rebase", async () => {
        const afterRebase = "101000000000";

        expect(await sEnctr.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sEnctr._agnosticBalance(initializer.address)).to.equal("100000000000");

        await sEnctr.rebase();
        expect(await sEnctr.balanceOf(initializer.address)).to.equal(afterRebase);
        expect(await sEnctr._agnosticBalance(initializer.address)).to.equal("100000000000");

        const rebasedAmount = "1000000000";
        await sEnctr.transfer(bob.address, rebasedAmount); // Transfer rebased amount

        expect(await sEnctr.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);
        expect(await sEnctr._agnosticBalance(initializer.address)).to.equal("99009900991");

        expect(await sEnctr.balanceOf(bob.address)).to.equal(Number(rebasedAmount) - 1); // Precision error ;(
        expect(await sEnctr._agnosticBalance(bob.address)).to.equal("990099009");
    });

    it("should drip funds to users", async () => {
        expect(await sEnctr.balanceOf(initializer.address)).to.equal(INITIAL_AMOUNT);

        await sEnctr.drip();

        expect(await sEnctr.balanceOf(initializer.address)).to.equal("200000000000");
    });
});
