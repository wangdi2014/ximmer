// vim: ts=4:expandtab:sw=4:cindent
//////////////////////////////////////////////////////////////////
// 
// Pipeline stage to run CODEX on exome data
//
//////////////////////////////////////////////////////////////////
codex_call_cnvs = {

    var batch_name : false

    def outputFile = batch_name ? batch_name + '.codex.cnvs.tsv' : input.bam + '.codex.cnvs.tsv'

    produce(outputFile) {
        R({"""

            source("$TOOLS/r-utils/cnv_utils.R")

            library(CODEX)

            bamFile = c('${inputs.bam.join("','")}')

            bam.samples = as.matrix(data.frame(sample=sapply(bam.files, function(file.name) {
                # Scan the bam header and parse out the sample name from the first read group
                read.group.info = strsplit(scanBamHeader(file.name)[[1]]$text[["@RG"]],":")
                names(read.group.info) = sapply(read.group.info, function(field) field[[1]]) 
                return(read.group.info$SM[[2]])
            })))

            bedFile <- "$input.bed"
            chr <- "$chr"

            bambedObj <- getbambed(bamdir = bamdir, bedFile = bedFile,
                                     sampname = sampname, projectname = "sureselect_sim", chr)
            
            bamdir <- bambedObj$bamdir; sampname <- bambedObj$sampname
            
            
            ref <- bambedObj$ref; 
            projectname <- bambedObj$projectname; 
            chr <- bambedObj$chr
            
            
            coverageObj <- getcoverage(bambedObj, mapqthres = 20)
            
            Y <- coverageObj$Y; readlength <- coverageObj$readlength
            
            gc <- getgc(chr, ref)
            
            mapp <- getmapp(chr, ref)
            
            qcObj <- qc(Y, sampname, chr, ref, mapp, gc, cov_thresh = c(20, 4000),
                        length_thresh = c(20, 2000), mapp_thresh = 0.9, gc_thresh = c(20, 80))
            
            Y_qc <- qcObj$Y_qc; 
            sampname_qc <- qcObj$sampname_qc; 
            gc_qc <- qcObj$gc_qc
            
            mapp_qc <- qcObj$mapp_qc; ref_qc <- qcObj$ref_qc; qcmat <- qcObj$qcmat
            
            normObj <- normalize(Y_qc, gc_qc, K = 1:9)
            
            Yhat <- normObj$Yhat; AIC <- normObj$AIC; BIC <- normObj$BIC

            RSS <- normObj$RSS; K <- normObj$K
            
            optK = K[which.max(BIC)]
            
            finalcall <- segment(Y_qc, Yhat, optK = optK, K = K, sampname_qc,
                                 ref_qc, chr, lmax = 200, mode = "integer")

            write.table(finalcall,
                        file="/misc/vcgs/exome/ximmer/codex.tsv",
                        row.names=F,
                        col.names=T,
                        quote=F,
                        sep="\\t"
                        )
        """}, "codex")
    }
    branch.caller_result = output.tsv
}

merge_codex = {
    exec """
        (head -1 $input.tsv; for i in $inputs.tsv; do grep -v 
    """
}

codex_pipeline = segment {
    chromosomes * [ codex_call_cnvs ] + merge_codex
}