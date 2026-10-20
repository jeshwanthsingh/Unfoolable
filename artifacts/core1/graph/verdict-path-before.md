# Before: verdict influence inventory

Source: `d8c0752050df9f17b769c8f28b99413d049f94d5`. 148 conservative candidate files; 1174 nodes; 3982 internal edges.

Conservative production result-token seeds plus resolved outgoing AST imports/calls dependency closure; includes producers, validators and observers. Not a complete dynamic influence proof.

## Direct result-bearing seeds

- `apps/server/chat-cards.ts`
- `apps/server/chat-events.ts`
- `apps/server/chat-status.ts`
- `apps/server/desk-stream.ts`
- `apps/server/mission-workflow.ts`
- `apps/server/oracle-execution.ts`
- `apps/server/oracle-tree.ts`
- `apps/server/phone-push.ts`
- `apps/server/playbook-checks.ts`
- `apps/server/project-recipes.ts`
- `apps/server/protected-existing-tests.ts`
- `apps/server/quality-gates.ts`
- `apps/server/review-risk.ts`
- `apps/server/test-tampering.ts`
- `apps/server/ticket-checker.ts`
- `apps/server/ticket-loop.ts`
- `apps/server/ticket-migration.ts`
- `apps/server/ticket-playbook-hooks.ts`
- `apps/server/ticket-queue.ts`
- `apps/server/ticket-service.ts`
- `apps/server/ticket-store.ts`
- `apps/server/verification-executor.ts`
- `apps/server/verification-migration.ts`
- `apps/server/verification-routes.ts`
- `apps/server/verification-store.ts`
- `apps/server/verify-only-admission.ts`
- `apps/server/verify-only.ts`
- `packages/shared/debug-validation.ts`
- `packages/shared/spec.ts`
- `packages/shared/ticket-activity.ts`
- `packages/shared/tickets.ts`
- `packages/shared/verification-v1.ts`
- `packages/shared/verification.ts`
- `packages/shared/verify-only-v2.ts`
- `packages/shared/verify-only.ts`
- `packages/shared/workshop.ts`

## Resolved dependencies and function locations

### apps/server/analysis-errors.ts

- `.constructor()` — L3

### apps/server/analysis-packet.ts

- `tokens()` — L12
- `digest()` — L13
- `compare()` — L14
- `safePath()` — L16
- `kind()` — L23
- `windows()` — L30
- `buildAnalysisPacket()` — L36

### apps/server/analysis-phase.ts

- `missionAnalysisPhase()` — L8

### apps/server/analysis-store.ts

- `record()` — L16
- `question()` — L17
- `createAnalysisStore()` — L19

### apps/server/analysis-validation.ts

- `invalid()` — L4
- `object()` — L5
- `text()` — L6
- `refs()` — L7
- `validateAnalysisResult()` — L8

### apps/server/build-admission.ts

- `digest()` — L19
- `fail()` — L20
- `admitBuild()` — L21

### apps/server/build-compatibility.ts

- `certifyBuilderVersion()` — L6
- `requireChatGPTAuthentication()` — L7

### apps/server/build-errors.ts

- `.constructor()` — L3

### apps/server/build-phase.ts

- `isCurrentBuildAttempt()` — L6
- `buildPhase()` — L10

### apps/server/build-processes.ts

- `query()` — L9
- `processIdentity()` — L10
- `ownedProcessSnapshot()` — L11
- `sameProcess()` — L12
- `pause()` — L13
- `reconcileOwnedProcessesFixture()` — L17
- `reconcileOwnedProcesses()` — L18
- `reconcile()` — L19

### apps/server/build-protocol.ts

- `sanitizeBuildValue()` — L2
- `boundedBuildData()` — L8
- `unsupportedResponse()` — L9
- `normalizeBuildEvent()` — L15

### apps/server/build-runtime.ts

- `environment()` — L23
- `prepareBuilderRuntime()` — L27
- `createCodexBuilderDriver()` — L46
- `runBuilderSupervisorFixture()` — L51
- `createCodexTicketDriver()` — L54
- `runBuilderReadProbe()` — L57
- `runBuilderTripwireProbe()` — L59
- `runBuilder()` — L60
- `denyOutstanding()` — L70
- `permissionRequest()` — L71
- `dispatchPermission()` — L83
- `stop()` — L91
- `snapshot()` — L92
- `engineeringOnly()` — L93
- `log()` — L94
- `send()` — L95
- `rpc()` — L96
- `notification()` — L97

### apps/server/build-store.ts

- `parse()` — L26
- `record()` — L27
- `createBuildStore()` — L31

### apps/server/build-workspace.ts

- `hash()` — L12
- `fail()` — L13
- `safeBuildGit()` — L15
- `gitText()` — L22
- `sourceIndexHash()` — L23
- `safeBuildPath()` — L24
- `attemptPaths()` — L29
- `dependencyLinkPolicy()` — L31
- `admittedDependencyLinks()` — L39
- `verifyDependencyLinks()` — L46
- `createBuildWorkspace()` — L52
- `owned()` — L68
- `getOwnedDependencyLinks()` — L78
- `regularTree()` — L79
- `captureBuildCandidate()` — L81
- `gitTextWithIndex()` — L108
- `immutableArtifact()` — L109

### apps/server/builder-filesystem.ts

- `within()` — L2
- `builderFilesystem()` — L4
- `resolvePath()` — L12

### apps/server/builder-private-paths.ts

- `canonicalReadRoots()` — L4
- `builderPrivateRoots()` — L5
- `overlapsPrivateRoot()` — L6

### apps/server/builder-tripwires.ts

- `tripwireStore()` — L3
- `parseTripwireDenial()` — L4
- `tripwireHelpersCertified()` — L10
- `pause()` — L11
- `startTripwireGuard()` — L13
- `certify()` — L24
- `canary()` — L25
- `close()` — L37

### apps/server/career-safe-playbook.ts

- `careerSafePlaybook()` — L20

### apps/server/chat-cards.ts

- `digest()` — L7
- `createChatCards()` — L8
- `ticketBinding()` — L9
- `permissionBinding()` — L13
- `current()` — L14
- `sync()` — L15

### apps/server/chat-events.ts

- `projectChatEvents()` — L5

### apps/server/chat-status.ts

- `referencedTicket()` — L5
- `ticketHarnessFailure()` — L10
- `ticketSummary()` — L20
- `ticketStatusText()` — L24
- `normalizedStatusQuestion()` — L28
- `isFuelQuestion()` — L29
- `statusAnswer()` — L30
- `typedAction()` — L37

### apps/server/chat-store.ts

- `now()` — L5
- `message()` — L6
- `draft()` — L7
- `card()` — L8
- `createChatStore()` — L10

### apps/server/codex-json.ts

- `childEnvironment()` — L18
- `jsonArguments()` — L25
- `prepareJsonDirectory()` — L29
- `jsonUsage()` — L37
- `runCodexJson()` — L39

### apps/server/config.ts

- `loadConfig()` — L7

### apps/server/content-identity.ts

- `planningContentIdentity()` — L5
- `migrateContentIdentity()` — L13
- `hasTable()` — L23
- `acceptedContractRow()` — L24
- `acceptedPlanningRow()` — L28
- `draftAccepted()` — L33

### apps/server/context-errors.ts

- `.constructor()` — L4

### apps/server/context-observation.ts

- `canonicalJson()` — L5
- `payloadHash()` — L10
- `trackedPathHash()` — L11
- `limitError()` — L13
- `checkedPaths()` — L14
- `parseStatus()` — L20
- `summarizePaths()` — L34
- `derive()` — L35
- `captureStableObservation()` — L47

### apps/server/context-repository.ts

- `decode()` — L8
- `filterOverrides()` — L9
- `observeRepository()` — L18

### apps/server/context-store.ts

- `snapshot()` — L11
- `createContextStore()` — L16

### apps/server/contract-errors.ts

- `.constructor()` — L3

### apps/server/contract-input.ts

- `fail()` — L6
- `buildContractInput()` — L10

### apps/server/contract-phase.ts

- `currentContractInputHash()` — L6
- `contractPhase()` — L9

### apps/server/contract-store.ts

- `canonicalContractJson()` — L14
- `semanticContent()` — L20
- `acceptedContentCanonical()` — L25
- `boundContentId()` — L26
- `acceptedCanonicalMatches()` — L27
- `draftRecord()` — L31
- `revisionRecord()` — L32
- `createContractStore()` — L34

### apps/server/contract-validation.ts

- `invalid()` — L4
- `unsupported()` — L5
- `object()` — L6
- `normalize()` — L7
- `numericTargets()` — L8
- `semantic()` — L12
- `validateContractPayload()` — L28

### apps/server/correction-admission.ts

- `admitCorrectionContext()` — L9

### apps/server/correction-workspace.ts

- `createCorrectionWorkspace()` — L10

### apps/server/data-mode.ts

- `canonical()` — L6
- `isolated()` — L7
- `dataMode()` — L8
- `fixtureApprovalsEnabled()` — L14
- `assertDataEntry()` — L16

### apps/server/debug-correction-prompt.ts

- No callable extracted; inspect source directly.

### apps/server/debug-diagnosis.ts

- `obj()` — L12
- `debugDiagnosisSchema()` — L15
- `fail()` — L23
- `object()` — L24
- `exact()` — L25
- `bounded()` — L26
- `validateDebugDiagnosis()` — L27
- `diagnoseVerificationFailure()` — L54

### apps/server/debug-ownership.ts

- `diagnosisOwnershipUncertain()` — L3

### apps/server/debug-packet.ts

- `fail()` — L12
- `clean()` — L13
- `safePath()` — L14
- `git()` — L15
- `sha()` — L16
- `boundedDebugText()` — L18
- `freeze()` — L22
- `makeFailurePacketFrom()` — L24
- `makeFailurePacket()` — L82

### apps/server/debug-store.ts

- `clean()` — L21
- `fail()` — L22
- `now()` — L23
- `failureObservationDigest()` — L24
- `createDebugStore()` — L29

### apps/server/desk-stream.ts

- `deskCursor()` — L5
- `deskSnapshot()` — L8
- `createDeskStream()` — L12
- `existingDraftTicket()` — L20
- `similarDraftTicket()` — L25

### apps/server/diagnosis-sampling.ts

- `diagnosisSamplingFaults()` — L3

### apps/server/diff-review.ts

- `reviewDigest()` — L5
- `createDiffReviewStore()` — L6
- `file()` — L8
- `viewed()` — L9
- `record()` — L10

### apps/server/draft-archive.ts

- `migrateDraftArchive()` — L3
- `archivedDraftIds()` — L7
- `changeDraftArchive()` — L8

### apps/server/effect-reconciliation.ts

- `reconcileAttemptEffects()` — L9
- `sample()` — L20

### apps/server/errors.ts

- `failure()` — L2
- `publicStartupError()` — L3

### apps/server/human-context.ts

- `withHumanReceipt()` — L8
- `enterHumanReceipt()` — L9
- `requireHuman()` — L10

### apps/server/log.ts

- `log()` — L3

### apps/server/mission-analyzer.ts

- `prepareAnalysisDirectory()` — L14
- `analyzeMission()` — L15

### apps/server/mission-errors.ts

- `.constructor()` — L5

### apps/server/mission-outcomes.ts

- `fail()` — L15
- `clean()` — L16
- `createMissionOutcomeStore()` — L17

### apps/server/mission-workflow.ts

- `createMissionWorkflow()` — L22
- `claimsFor()` — L28
- `startBuild()` — L95
- `advance()` — L96

### apps/server/missions.ts

- `fromRow()` — L10
- `publicPhase()` — L11
- `requireProject()` — L16
- `storageError()` — L20
- `createMission()` — L25
- `listMissions()` — L37
- `getMission()` — L43

### apps/server/oracle-author.ts

- `canonical()` — L15
- `hash()` — L16
- `evaluationSignature()` — L17
- `string()` — L18
- `object()` — L19
- `schema()` — L23
- `validateAuthoredOracleTests()` — L25
- `readOracle()` — L55
- `prepareNativeEvaluation()` — L62
- `admitNativeManifest()` — L113
- `replayNativeEvaluation()` — L134
- `assertFastLaneOracleTests()` — L141
- `captureBaseUiReference()` — L147
- `validateUiReferenceRequests()` — L162
- `validateNodeUiJudgeCode()` — L166
- `recordOracleProposal()` — L170

### apps/server/oracle-execution.ts

- `pause()` — L14
- `oracleOutputPreview()` — L18
- `oracleInput()` — L25
- `oracleSandbox()` — L37
- `processRun()` — L46
- `bundleOracleCandidate()` — L77
- `executeOracleTest()` — L119
- `executeCandidateTests()` — L174

### apps/server/oracle-source.ts

- `oracleSource()` — L9

### apps/server/oracle-suite-policy.ts

- `suiteExclusions()` — L5
- `suiteExactReads()` — L6

### apps/server/oracle-tree.ts

- `entries()` — L9
- `workspaceFiles()` — L28
- `materializeOracleTree()` — L38
- `isOracleTestPath()` — L54
- `restoreBaseTests()` — L55
- `changedPaths()` — L63
- `dependencyChanges()` — L64
- `reviewTripwire()` — L66

### apps/server/permission-validation.ts

- `reject()` — L7
- `object()` — L8
- `keys()` — L9
- `canonical()` — L10
- `effectPath()` — L17
- `validatePermission()` — L25

### apps/server/phone-access.ts

- `validPhoneOrigin()` — L2
- `phoneOrigin()` — L3
- `phoneOwner()` — L4
- `expectedPrivateServe()` — L5
- `cli()` — L6
- `privatePhoneStatus()` — L7
- `enablePrivatePhone()` — L8

### apps/server/phone-push.ts

- `migratePhonePush()` — L4
- `safeAlertTitle()` — L7
- `pushSubscription()` — L8
- `loadPushKeys()` — L9
- `createPhonePush()` — L10
- `settings()` — L11
- `update()` — L12
- `deliver()` — L13

### apps/server/planning-drafter.ts

- `draftMissionPlan()` — L18
- `isFastLaneAnalysis()` — L24
- `constrainFastLanePlanning()` — L29

### apps/server/planning-errors.ts

- `.constructor()` — L3

### apps/server/planning-input.ts

- `fail()` — L12
- `buildPlanningInput()` — L14

### apps/server/planning-phase.ts

- `currentPlanningInputHash()` — L6
- `planningPhase()` — L11

### apps/server/planning-store.ts

- `parse()` — L18
- `boundInputHash()` — L19
- `draftRecord()` — L20
- `planRecord()` — L21
- `evaluationRecord()` — L22
- `createPlanningStore()` — L23

### apps/server/planning-validation.ts

- `fail()` — L5
- `unsupported()` — L6
- `coverageError()` — L7
- `object()` — L8
- `text()` — L9
- `texts()` — L10
- `refs()` — L11
- `normalized()` — L12
- `negative()` — L13
- `clauses()` — L14
- `numericTargets()` — L15
- `performanceBehavior()` — L16
- `checkPlanningMetrics()` — L17
- `semantics()` — L21
- `meaningful()` — L34
- `validatePlanningPayload()` — L35
- `textArray()` — L85
- `refArray()` — L87
- `objectSchema()` — L88

### apps/server/playbook-checks.ts

- `parsePlaybookTests()` — L7
- `observedOldTestCount()` — L17
- `hash()` — L20
- `createPlaybookChecks()` — L21
- `run()` — L22
- `command()` — L27
- `admit()` — L32
- `check()` — L38

### apps/server/project-body.ts

- `projectBody()` — L4

### apps/server/project-errors.ts

- `.constructor()` — L5

### apps/server/project-playbooks.ts

- `.constructor()` — L18
- `invalid()` — L22
- `hash()` — L23
- `rootOf()` — L24
- `safeText()` — L25
- `command()` — L26
- `validatePlaybookDefinition()` — L36
- `createProjectPlaybookStore()` — L54

### apps/server/project-recipes.ts

- `fileHash()` — L13
- `definition()` — L14
- `createProjectRecipeStore()` — L15

### apps/server/projects.ts

- `project()` — L8
- `listProjects()` — L10
- `registerProject()` — L13

### apps/server/protected-existing-tests.ts

- `vitestTestIdentity()` — L3
- `classifyExistingTests()` — L9
- `executeProtectedExistingTests()` — L49
- `collectExistingTests()` — L61

### apps/server/quality-gates.ts

- `qualityPolicyHash()` — L10
- `py()` — L11
- `js()` — L11
- `bin()` — L11
- `changedLines()` — L12
- `key()` — L13
- `newQualityFindings()` — L14
- `proposeQualityGates()` — L15
- `records()` — L16
- `runQualityGates()` — L34

### apps/server/repository-identity.ts

- `readRepositoryIdentities()` — L9
- `repositoryIdentity()` — L11

### apps/server/repository.ts

- `absoluteRepoPath()` — L9
- `within()` — L17
- `outside()` — L20
- `gitBytes()` — L22
- `gitRead()` — L32
- `unexpected()` — L35
- `validateRepository()` — L42

### apps/server/review-risk.ts

- `reviewRisk()` — L4

### apps/server/runtime-permissions.ts

- `binding()` — L8
- `read()` — L9
- `createPermissionStore()` — L10
- `current()` — L12
- `stale()` — L13
- `request()` — L14
- `decide()` — L27
- `resolved()` — L51
- `invalidate()` — L52
- `attention()` — L55

### apps/server/spec-errors.ts

- `.constructor()` — L3

### apps/server/test-edit-review.ts

- `existingTestsUnchanged()` — L7
- `reviewTestEdits()` — L13

### apps/server/test-tampering.ts

- `compareTestAssertions()` — L5
- `runTestTampering()` — L12

### apps/server/test-writer-admission.ts

- `writerPolicyForScore()` — L12
- `nativeAdmission()` — L13
- `hash()` — L17
- `runNativeTestWriter()` — L18
- `writerPolicyForEvidenceSets()` — L62

### apps/server/test-writer-context.ts

- `remainingWriterTokens()` — L4
- `relevantBaseDefinitions()` — L6
- `writerContextPack()` — L12

### apps/server/test-writer-coverage.ts

- `productionWriterDiff()` — L6
- `writerCoverageCommands()` — L11
- `normalizeDiffCoverage()` — L15
- `finishWriterCoverage()` — L20

### apps/server/test-writer-execution.ts

- `nativeVitestAssertion()` — L10
- `classifyWriterNative()` — L13
- `executeWriterNative()` — L25

### apps/server/test-writer-mutation.ts

- `changedWriterLines()` — L4
- `runWriterMutations()` — L5

### apps/server/test-writer-native.ts

- `nativeWriterLayout()` — L14
- `authorNativeWriter()` — L22

### apps/server/test-writer-session.ts

- `baseReader()` — L10
- `runWriterSession()` — L17

### apps/server/test-writer.ts

- `hash()` — L8
- `authorTestWriter()` — L19
- `runConcurrencyWriter()` — L27
- `runTestWriter()` — L42

### apps/server/ticket-budget.ts

- `ticketBudget()` — L2
- `recordTicketLimits()` — L6
- `budgetExceeded()` — L9
- `extendTicketBudget()` — L11
- `activeBudgetMilliseconds()` — L20

### apps/server/ticket-checker.ts

- `createTicketChecker()` — L4

### apps/server/ticket-dependencies.ts

- `npmLockInputs()` — L4
- `pythonLockInputs()` — L14
- `requireBaseInput()` — L22
- `installPinned()` — L27
- `prepareTicketDependencies()` — L41

### apps/server/ticket-loop.ts

- `createTicketLoop()` — L8
- `run()` — L11

### apps/server/ticket-migration.ts

- `migrateTickets()` — L3

### apps/server/ticket-playbook-hooks.ts

- `ticketPlaybookHooks()` — L4

### apps/server/ticket-queue.ts

- `createTicketQueue()` — L2
- `cleanup()` — L4
- `wake()` — L9
- `recover()` — L10
- `retry()` — L11
- `stopAll()` — L13
- `close()` — L17

### apps/server/ticket-service.ts

- `createTicketService()` — L25
- `evidenceProblem()` — L34
- `show()` — L50
- `recheck()` — L56
- `recheckSame()` — L57
- `checkOnly()` — L60
- `continueBudget()` — L73
- `retry()` — L74
- `create()` — L75
- `decide()` — L77

### apps/server/ticket-stats.ts

- `ticketStats()` — L2
- `ticketStatsSummary()` — L5

### apps/server/ticket-store.ts

- `sha()` — L6
- `text()` — L7
- `requireTicket()` — L8
- `transaction()` — L9
- `ticket()` — L10
- `getTicket()` — L11
- `listTickets()` — L12
- `listTicketEvents()` — L13
- `appendTicketEvent()` — L14
- `createTicket()` — L20
- `updateTicket()` — L24
- `rejection()` — L41
- `changeState()` — L42
- `transitionTicket()` — L47
- `decideTicket()` — L57
- `beginTicketRecheck()` — L67

### apps/server/ticket-workspace.ts

- `text()` — L2
- `ticketWorkspace()` — L3
- `freezeTicketCandidate()` — L9
- `cleanTicketWorkspace()` — L18

### apps/server/verification-environment.ts

- `verifierEnvironment()` — L6

### apps/server/verification-executor.ts

- `hash()` — L16
- `hostModule()` — L20
- `evaluatorBundle()` — L42
- `protectedSandboxProfile()` — L51
- `executeProtectedStep()` — L58
- `executeNativeStep()` — L107
- `executeCandidateTestStep()` — L126

### apps/server/verification-migration.ts

- `migrateVerification()` — L3

### apps/server/verification-recipe.ts

- `verificationHash()` — L7
- `createVerificationRecipe()` — L11
- `recipeCanonicalMatches()` — L33
- `semanticRecipeSteps()` — L43

### apps/server/verification-routes.ts

- `verificationRoute()` — L5

### apps/server/verification-store.ts

- `fail()` — L24
- `verifiedArtifact()` — L28
- `executeStaticVerification()` — L34
- `createVerificationStore()` — L44

### apps/server/verification-workspace.ts

- `digest()` — L13
- `id()` — L14
- `validatePackBudget()` — L17
- `regular()` — L30
- `verificationTreeHash()` — L31
- `materializeCandidate()` — L38
- `materializeNativeVerification()` — L60

### apps/server/verify-only-admission.ts

- `executionStatus()` — L14
- `scopedRevision()` — L19
- `referenceTree()` — L20
- `executionTest()` — L25
- `sampledOutcomes()` — L33
- `admitVerifyOnly()` — L40

### apps/server/verify-only-author.ts

- `str()` — L11
- `obj()` — L12
- `escaped()` — L27
- `fixtureCode()` — L30
- `fixtureImports()` — L31
- `fixtureInvokes()` — L32
- `fixtureUsesComponent()` — L33
- `nonvisualTarget()` — L34
- `authorVerifyOnly()` — L38

### apps/server/verify-only-authoring.ts

- `hash()` — L16
- `admittedCheck()` — L17
- `authorAndAdmit()` — L18

### apps/server/verify-only-deadline.ts

- `.constructor()` — L1
- `verifyStep()` — L2

### apps/server/verify-only-identity.ts

- `verifyHash()` — L5
- `verifyTreeHash()` — L6

### apps/server/verify-only-references.ts

- `str()` — L9
- `obj()` — L10
- `authorVerifyReferences()` — L14

### apps/server/verify-only-retry.ts

- `retryableHarnessError()` — L8
- `retryableExecution()` — L11
- `harnessRetry()` — L15
- `retryEvidence()` — L26

### apps/server/verify-only.ts

- `fileHash()` — L30
- `scoreVerifyOnly()` — L32
- `createVerifyOnly()` — L33

### apps/server/watchman.ts

- `blockedCommand()` — L4
- `watchmanActions()` — L13

### apps/server/writer-concurrent-args.ts

- `concurrentPublicArgs()` — L3

### packages/shared/analysis.ts

- `object()` — L19
- `text()` — L20
- `hash()` — L21
- `strings()` — L22
- `isResult()` — L23
- `isPacket()` — L28
- `isAnalysis()` — L32
- `isAnalysisView()` — L37
- `isAttentionResponse()` — L40

### packages/shared/build.ts

- No callable extracted; inspect source directly.

### packages/shared/chat.ts

- `object()` — L14
- `nullableString()` — L15
- `tokenCount()` — L16
- `isUsage()` — L17
- `isChatView()` — L18

### packages/shared/check-copy.ts

- `gapSentence()` — L2

### packages/shared/context.ts

- `record()` — L15
- `count()` — L16
- `hash()` — L17
- `paths()` — L19
- `isContextPayload()` — L22
- `isContextSnapshot()` — L31
- `isContextResponse()` — L34

### packages/shared/contracts.ts

- `contractObject()` — L23
- `contractText()` — L24
- `contractHash()` — L25
- `contractKeys()` — L26
- `isContractSource()` — L27
- `isContractInput()` — L33
- `isContractPayload()` — L39
- `isContractDraft()` — L45
- `isContractRevision()` — L50
- `isContractView()` — L54

### packages/shared/debug-validation.ts

- `object()` — L4
- `text()` — L5
- `id()` — L6
- `hash()` — L7
- `tree()` — L8
- `nullable()` — L9
- `list()` — L10
- `fields()` — L11
- `ids()` — L12
- `finite()` — L13
- `process()` — L14
- `cleanup()` — L15
- `diagnosisArtifact()` — L16
- `diagnosis()` — L17
- `packet()` — L18
- `candidate()` — L19
- `run()` — L20
- `cycleBindings()` — L21
- `cycle()` — L22
- `resolvedSession()` — L23
- `session()` — L24
- `isDebugView()` — L26

### packages/shared/debug.ts

- No callable extracted; inspect source directly.

### packages/shared/display-title.ts

- `wordPreview()` — L1
- `plainTitle()` — L2

### packages/shared/missions.ts

- `validMissionIntent()` — L11
- `isMission()` — L14
- `isMissionsResponse()` — L20

### packages/shared/oracle.ts

- `isOracleReference()` — L8

### packages/shared/outcomes.ts

- No callable extracted; inspect source directly.

### packages/shared/permissions.ts

- No callable extracted; inspect source directly.

### packages/shared/planning.ts

- `po()` — L33
- `pt()` — L34
- `ph()` — L35
- `pk()` — L36
- `pa()` — L37
- `planningEdits()` — L57
- `isPlanningPair()` — L63
- `isPlanningView()` — L71
- `isAttentionResponse()` — L78

### packages/shared/playbooks.ts

- No callable extracted; inspect source directly.

### packages/shared/projects.ts

- `isProject()` — L13
- `isProjectsResponse()` — L20

### packages/shared/quality-gates.ts

- `object()` — L9
- `isQualityEvidence()` — L10
- `isTamperingEvidence()` — L11
- `isReviewEvidence()` — L13

### packages/shared/review-risk.ts

- `isReviewRisk()` — L2

### packages/shared/spec.ts

- `text()` — L7
- `isSpecView()` — L8

### packages/shared/test-writer.ts

- `isWriterWarning()` — L3
- `writerWarnings()` — L4
- `isTestWriterEvidence()` — L10
- `isWriterLineCoverage()` — L12
- `isWriterMutation()` — L14

### packages/shared/ticket-activity.ts

- `active()` — L4
- `pathLabel()` — L6
- `projectActivity()` — L10
- `liveLine()` — L52

### packages/shared/ticket-budget.ts

- No callable extracted; inspect source directly.

### packages/shared/tickets.ts

- No callable extracted; inspect source directly.

### packages/shared/verification-v1.ts

- `testWriterLayer()` — L9
- `scoreV1()` — L15
- `record()` — L26
- `keys()` — L27
- `nonempty()` — L28
- `hash()` — L29
- `status()` — L30
- `gap()` — L31
- `isV1Report()` — L32

### packages/shared/verification.ts

- `object()` — L14
- `keys()` — L15
- `text()` — L16
- `sha()` — L17
- `git()` — L18
- `integer()` — L19
- `timestamp()` — L20
- `strings()` — L21
- `validClaim()` — L24
- `validRecipe()` — L28
- `validProcess()` — L36
- `validCleanup()` — L39
- `validResult()` — L42
- `validEnvironment()` — L45
- `validRun()` — L53
- `isVerificationView()` — L63

### packages/shared/verify-only-v2.ts

- `scoreVerifyV2()` — L4

### packages/shared/verify-only.ts

- `isVerifyView()` — L13

### packages/shared/workshop.ts

- `stationFor()` — L14
- `projectTicketEvents()` — L16
- `vaultMayOpen()` — L47
