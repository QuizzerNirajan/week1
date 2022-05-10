const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { plonk, groth16 } = require("snarkjs");

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

describe("HelloWorld", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        // Using a fully qualified name becasue of multiple ambigious artifacts
        Verifier = await ethers.getContractFactory("contracts/HelloWorldVerifier.sol:HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing

        // Generate proof and publicSignals for the witness a:1, b:2
        const { proof, publicSignals } = await groth16.fullProve({"a":"1","b":"2"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");

        // LOG(display) the result of the multiplicaition with the  public signal in the console
        console.log('1x2 =',publicSignals[0]);

        // Convert public signal values to BigInts
        const editedPublicSignals = unstringifyBigInts(publicSignals);

        // Convert proof valies to BigInts
        const editedProof = unstringifyBigInts(proof);

        // Prepare and export the proof and public signal values for smart contract call for verification of the proof
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);

        // Parse and convert numeric inputs from the calldata string into one-dim array of BigIntegers
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

        // Format the signal and proof values  to coincide with the a, b, c structure
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        // Expect that the verifiers response will be true
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

     // Expect that the verifiers response will be false
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {

    let Verifier;
    let verifier;

    beforeEach(async function () {
        // Using a fully qualified name becasue of multiple ambigious artifacts
        Verifier = await ethers.getContractFactory("contracts/Multiplier3Verifier.sol:Multiplier3Verifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
       
        const { proof, publicSignals } = await groth16.fullProve(
            { "a": "1", "b": "2", "c": "4" },
            "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm", "contracts/circuits/Multiplier3/circuit_final.zkey"
        );

        console.log('1x2x4 =',publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        //[assignment] insert your script here
        Verifier = await ethers.getContractFactory("contracts/_plonkMultiplier3Verifier.sol:PlonkVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {

        const { proof, publicSignals } = await plonk.fullProve(
            {"a":"1","b":"2","c":"5"}, 
            "contracts/circuits/_plonkMultiplier3/Multiplier3_js/Multiplier3.wasm","contracts/circuits/_plonkMultiplier3/circuit_last.zkey"
        );

        
        console.log('1x2x5 =',publicSignals[0]);
        const editedPublicSignals = unstringifyBigInts(publicSignals);

        const editedProof = unstringifyBigInts(proof);

        
        const calldata = await plonk.exportSolidityCallData(editedProof, editedPublicSignals);

        const argv = calldata.replace(/["[\]\s]/g, "").split(',');

        const proofBytes = argv[0];
        const Input = [argv[1].toString()];

        expect(await verifier.verifyProof(proofBytes, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {

        let falseProofBytes = "0xa1";
        let publicSignal = [0];

        expect(await verifier.verifyProof(falseProofBytes, publicSignal)).to.be.false;
    });
});