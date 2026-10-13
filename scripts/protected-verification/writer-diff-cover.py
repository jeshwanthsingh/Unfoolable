"""Trusted diff-cover adapter for git-archive exports (no .git, no Candidate imports)."""
import sys
from diff_cover.git_path import GitPathTool
from diff_cover.git_diff import GitDiffFileTool
from diff_cover.diff_cover_tool import generate_coverage_report
root, coverage, patch, report = sys.argv[1:]
# The coordinator supplied the immutable diff. No repository discovery or Git
# execution is needed inside a disposable archive export.
GitPathTool._root = root
GitPathTool._cwd = root
generate_coverage_report([coverage], None, GitDiffFileTool(patch), report_formats={'json': report}, quiet=True)
