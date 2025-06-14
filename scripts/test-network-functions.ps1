#!/usr/bin/env pwsh

<#
.SYNOPSIS
    PowerShell wrapper for comprehensive network functions testing

.DESCRIPTION
    This script provides a PowerShell interface for running comprehensive
    network function tests against the controller hardware. It includes
    proper error handling, logging, and cross-platform compatibility.

.PARAMETER TestType
    Type of test to run: 'all', 'discovery', 'time', 'server', 'network', 'protocol'

.PARAMETER Timeout
    Discovery timeout in milliseconds (default: 10000)

.PARAMETER LogLevel
    Logging level: 'info', 'verbose', 'quiet' (default: 'info')

.PARAMETER SaveResults
    Whether to save results to file (default: true)

.EXAMPLE
    .\test-network-functions.ps1
    Run all network tests with default settings

.EXAMPLE
    .\test-network-functions.ps1 -TestType discovery -Timeout 15000
    Run only discovery test with 15 second timeout

.EXAMPLE
    .\test-network-functions.ps1 -LogLevel verbose
    Run all tests with verbose logging
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('all', 'discovery', 'time', 'server', 'network', 'protocol')]
    [string]$TestType = 'all',
    
    [Parameter(Mandatory=$false)]
    [int]$Timeout = 10000,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('info', 'verbose', 'quiet')]
    [string]$LogLevel = 'info',
    
    [Parameter(Mandatory=$false)]
    [bool]$SaveResults = $true
)

# Script configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$TestScript = Join-Path $ScriptDir "test-network-comprehensive.js"
$LogsDir = Join-Path $ProjectRoot "logs"

# Ensure logs directory exists
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = 'White'
    )
    
    if ($LogLevel -ne 'quiet') {
        Write-Host $Message -ForegroundColor $Color
    }
}

# Function to check Node.js availability
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Node.js found: $nodeVersion" Green
            return $true
        }
    } catch {
        # Node.js not found
    }
    
    Write-ColorOutput "❌ Node.js not found. Please install Node.js from https://nodejs.org/" Red
    return $false
}

# Function to check if controller test script exists
function Test-TestScript {
    if (Test-Path $TestScript) {
        Write-ColorOutput "✅ Test script found: $TestScript" Green
        return $true
    } else {
        Write-ColorOutput "❌ Test script not found: $TestScript" Red
        return $false
    }
}

# Function to run the network tests
function Invoke-NetworkTests {
    param(
        [string]$Type,
        [int]$TimeoutMs,
        [string]$Level
    )
    
    Write-ColorOutput "`n🚀 Starting Network Functions Test Suite" Cyan
    Write-ColorOutput "=========================================" Cyan
    Write-ColorOutput "Test Type: $Type" White
    Write-ColorOutput "Timeout: $TimeoutMs ms" White
    Write-ColorOutput "Log Level: $Level" White
    Write-ColorOutput "Save Results: $SaveResults" White
    Write-ColorOutput ""
    
    # Prepare Node.js command
    $nodeArgs = @($TestScript)
    
    # Set environment variables for test configuration
    $env:TEST_TYPE = $Type
    $env:TEST_TIMEOUT = $TimeoutMs
    $env:LOG_LEVEL = $Level
    $env:SAVE_RESULTS = $SaveResults
    
    try {
        # Run the Node.js test script
        Write-ColorOutput "Executing: node $TestScript" Yellow
        Write-ColorOutput ""
        
        $process = Start-Process -FilePath "node" -ArgumentList $nodeArgs -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-ColorOutput "`n✅ Test execution completed successfully" Green
        } else {
            Write-ColorOutput "`n❌ Test execution failed with exit code: $($process.ExitCode)" Red
        }
        
        return $process.ExitCode
        
    } catch {
        Write-ColorOutput "`n❌ Failed to execute test script: $($_.Exception.Message)" Red
        return 1
    }
}

# Function to display test results summary
function Show-TestSummary {
    Write-ColorOutput "`n📊 Test Results Summary" Cyan
    Write-ColorOutput "======================" Cyan
    
    # Find the most recent test results file
    $resultsFiles = Get-ChildItem -Path $LogsDir -Filter "network_test_results_*.json" -ErrorAction SilentlyContinue | 
                   Sort-Object LastWriteTime -Descending
    
    if ($resultsFiles.Count -gt 0) {
        $latestResults = $resultsFiles[0]
        Write-ColorOutput "Latest results file: $($latestResults.Name)" White
        
        try {
            $results = Get-Content $latestResults.FullName | ConvertFrom-Json
            
            Write-ColorOutput "`nTest Summary:" White
            Write-ColorOutput "  Total Tests: $($results.summary.totalTests)" White
            Write-ColorOutput "  Passed: $($results.summary.passedTests)" Green
            Write-ColorOutput "  Failed: $($results.summary.failedTests)" $(if ($results.summary.failedTests -gt 0) { "Red" } else { "White" })
            Write-ColorOutput "  Success Rate: $($results.summary.successRate)%" $(if ($results.summary.successRate -ge 90) { "Green" } elseif ($results.summary.successRate -ge 70) { "Yellow" } else { "Red" })
            Write-ColorOutput "  Duration: $([math]::Round($results.summary.totalDuration / 1000, 2)) seconds" White
            
            if ($results.controller) {
                Write-ColorOutput "`nController Information:" White
                Write-ColorOutput "  Serial: $($results.controller.serialNumber)" White
                Write-ColorOutput "  IP: $($results.controller.ip)" White
                Write-ColorOutput "  MAC: $($results.controller.macAddress)" White
                Write-ColorOutput "  Driver: $($results.controller.driverVersion)" White
            }
            
        } catch {
            Write-ColorOutput "Failed to parse results file: $($_.Exception.Message)" Red
        }
    } else {
        Write-ColorOutput "No test results files found in $LogsDir" Yellow
    }
}

# Main execution
function Main {
    Write-ColorOutput "🧪 Network Functions Test Suite - PowerShell Wrapper" Cyan
    Write-ColorOutput "====================================================" Cyan
    Write-ColorOutput ""
    
    # Check prerequisites
    if (-not (Test-NodeJS)) {
        exit 1
    }
    
    if (-not (Test-TestScript)) {
        exit 1
    }
    
    # Run the tests
    $exitCode = Invoke-NetworkTests -Type $TestType -TimeoutMs $Timeout -Level $LogLevel
    
    # Show summary if results should be saved
    if ($SaveResults) {
        Show-TestSummary
    }
    
    # Final status
    Write-ColorOutput ""
    if ($exitCode -eq 0) {
        Write-ColorOutput "🎉 Test suite completed successfully!" Green
    } else {
        Write-ColorOutput "❌ Test suite completed with errors" Red
    }
    
    exit $exitCode
}

# Execute main function
Main
