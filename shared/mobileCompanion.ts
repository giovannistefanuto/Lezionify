export interface MobileCompanionStatus { enabled: boolean; memoEnabled?: boolean; destination?: string; publishedAt?: string; error?: string }
export interface MobileCompanionSetup { owner: string; repo: string; branch: string; token: string }
export interface MobileCompanionApi {
  setMemoEnabled(enabled: boolean): Promise<MobileCompanionStatus>
  state(): Promise<MobileCompanionStatus>
  configure(input: MobileCompanionSetup): Promise<MobileCompanionStatus>
  pairing(): Promise<string>
  publish(): Promise<MobileCompanionStatus>
  disable(): Promise<MobileCompanionStatus>
}
