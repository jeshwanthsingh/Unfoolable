// Host-only CryptoKit helper; the Builder cannot read or execute this path.
import Foundation
import CryptoKit
import Security

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8)); exit(1)
}
let args = CommandLine.arguments
guard args.count == 3, ["create", "sign"].contains(args[1]) else { fail("Expected create|sign and protected blob path") }
do {
    guard SecureEnclave.isAvailable else { fail("Secure Enclave unavailable") }
    let url = URL(fileURLWithPath: args[2])
    if args[1] == "create" {
        guard !FileManager.default.fileExists(atPath: url.path) else { fail("Refusing to replace an existing key") }
        var error: Unmanaged<CFError>?
        // Background sealing after first unlock; no biometrics/user-presence requirement.
        guard let acl = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly, .privateKeyUsage, &error) else { fail("Key access control unavailable") }
        let key = try SecureEnclave.P256.Signing.PrivateKey(accessControl: acl)
        try key.dataRepresentation.write(to: url, options: .withoutOverwriting)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
        print(key.publicKey.pemRepresentation)
    } else {
        let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
        guard attributes[.type] as? FileAttributeType == .typeRegular,
              (attributes[.posixPermissions] as? NSNumber)?.intValue == 0o600 else { fail("Protected key blob permissions changed") }
        let key = try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: Data(contentsOf: url))
        // Bound input before parsing. Arbitrary-message signing is not exposed.
        let input = FileHandle.standardInput.readData(ofLength: 1_048_577)
        guard input.count <= 1_048_576, input.starts(with: Data("DSSEv1 ".utf8)) else { fail("Only bounded DSSE messages are signed") }
        print(try key.signature(for: input).derRepresentation.base64EncodedString())
    }
} catch { fail("Secure Enclave operation failed: \(error)") }
